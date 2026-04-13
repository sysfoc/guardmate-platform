import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import Payment from '@/models/Payment.model';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import GuardWallet from '@/models/GuardWallet.model';
import { AdminDecision, DisputeStatus, JobPaymentStatus, EscrowPaymentStatus, UserRole, PaymentMethod } from '@/types/enums';
import { sendDisputeResolved, sendDisputeResolvedAdmin } from '@/lib/email/emailTriggers';
import { releasePayment } from '@/lib/payments/releasePayment';
import { getStripeInstance } from '@/lib/payments/stripeClient';
import { getPayPalConfig, getPayPalAccessToken } from '@/lib/payments/paypalClient';
import { updateGuardReliabilityScore } from '@/lib/jobs/reliabilityScore';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Forbidden. Admin only.', 403);
    }

    const { decision, adminNotes, adminDecisionAmount } = await request.json();

    if (!Object.values(AdminDecision).includes(decision)) {
      return createApiResponse(false, null, 'Invalid admin decision.', 400);
    }
    if (!adminNotes) {
      return createApiResponse(false, null, 'Admin notes are required for accountability.', 400);
    }

    await connectDB();

    const dispute = await Dispute.findById(params.id);
    if (!dispute) return createApiResponse(false, null, 'Dispute not found.', 404);

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      return createApiResponse(false, null, 'Dispute is already resolved.', 400);
    }

    const payment = await Payment.findById(dispute.paymentId);
    if (!payment) return createApiResponse(false, null, 'Payment record not found.', 400);

    const guardAmount = payment.guardPayout;
    
    if (decision === AdminDecision.PARTIAL) {
      if (adminDecisionAmount === undefined || adminDecisionAmount <= 0 || adminDecisionAmount > guardAmount) {
        return createApiResponse(false, null, 'Invalid partial amount.', 400);
      }
      // Ensure partial refund doesn't exceed what the boss actually paid
      const estimatedRefund = payment.totalChargedToBoss - adminDecisionAmount;
      if (estimatedRefund < 0) {
        return createApiResponse(false, null, 'Partial amount would result in a negative refund. Amount exceeds total charged.', 400);
      }
    }

    let amountReleased = 0;
    let amountRefunded = 0;

    // ─── RELEASE Decision ────────────────────────────────────────────────────
    if (decision === AdminDecision.RELEASE) {
      // releasePayment() already uses its own MongoDB transaction for atomicity
      const releaseResult = await releasePayment(dispute.jobId);
      if (!releaseResult.success) {
        return createApiResponse(false, null, `Release failed: ${releaseResult.message}`, 400);
      }
      amountReleased = guardAmount;
      
      // Remaining DB writes in a transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // Update Boss strikes
        await User.updateOne(
          { uid: dispute.bossUid }, 
          { $inc: { cancellationStrikes: 1 } }
        ).session(session);
        
        // Update Dispute
        dispute.adminDecision = decision;
        dispute.adminNotes = adminNotes;
        dispute.resolvedBy = user.uid;
        dispute.resolvedAt = new Date();
        dispute.status = DisputeStatus.RESOLVED;
        await dispute.save({ session });

        await session.commitTransaction();
        session.endSession();
      } catch (txError) {
        await session.abortTransaction();
        session.endSession();
        console.error('RELEASE transaction failed (payment already released):', txError);
        return createApiResponse(false, null, 'Dispute update failed after payment release. Please check and retry.', 500);
      }

    // ─── REFUND Decision ─────────────────────────────────────────────────────
    } else if (decision === AdminDecision.REFUND) {
      amountRefunded = payment.totalChargedToBoss;

      // Phase 1: External refund (cannot be in a MongoDB transaction)
      try {
        if (payment.paymentMethod === PaymentMethod.STRIPE && payment.stripePaymentIntentId) {
          const stripe = await getStripeInstance();
          await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
        } else if (payment.paymentMethod === PaymentMethod.PAYPAL && payment.paypalCaptureId) {
          const config = await getPayPalConfig();
          const accessToken = await getPayPalAccessToken();
          const refundResp = await fetch(`${config.baseUrl}/v2/payments/captures/${payment.paypalCaptureId}/refund`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (!refundResp.ok) {
            const refundError = await refundResp.text();
            throw new Error(`PayPal refund failed: ${refundError}`);
          }
        }
      } catch (refundError: any) {
        console.error('External refund failed:', refundError);
        return createApiResponse(false, null, `Refund failed: ${refundError.message}`, 400);
      }

      // Phase 2: All DB updates in a transaction (atomic)
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // Verify guard wallet has sufficient pending balance before deducting
        const wallet = await GuardWallet.findOne({ guardUid: dispute.guardUid }).session(session);
        if (wallet && wallet.pendingBalance < guardAmount) {
          console.error(`[REFUND] Guard ${dispute.guardUid} pendingBalance (${wallet.pendingBalance}) < guardAmount (${guardAmount}). Clamping deduction.`);
          // Clamp to available pending balance to avoid negative
          await GuardWallet.updateOne(
            { guardUid: dispute.guardUid },
            { $set: { pendingBalance: 0 } }
          ).session(session);
        } else {
          await GuardWallet.updateOne(
            { guardUid: dispute.guardUid },
            { $inc: { pendingBalance: -guardAmount } }
          ).session(session);
        }

        // Update Payment
        payment.paymentStatus = EscrowPaymentStatus.REFUNDED;
        payment.refundedAt = new Date();
        payment.refundReason = 'DISPUTE_RESOLUTION_REFUND';
        await payment.save({ session });
        
        // Update Job
        await Job.updateOne(
          { jobId: dispute.jobId }, 
          { $set: { paymentStatus: JobPaymentStatus.REFUNDED } }
        ).session(session);

        // Update Guard Reliability (strikes +1)
        await User.updateOne(
          { uid: dispute.guardUid }, 
          { $inc: { cancellationStrikes: 1 } }
        ).session(session);

        // Update Dispute
        dispute.adminDecision = decision;
        dispute.adminNotes = adminNotes;
        dispute.resolvedBy = user.uid;
        dispute.resolvedAt = new Date();
        dispute.status = DisputeStatus.RESOLVED;
        await dispute.save({ session });

        await session.commitTransaction();
        session.endSession();
      } catch (txError) {
        await session.abortTransaction();
        session.endSession();
        // CRITICAL: External refund succeeded but DB failed. Log for manual reconciliation.
        console.error('CRITICAL: Refund succeeded externally but DB transaction failed. Manual reconciliation needed.', {
          disputeId: params.id,
          jobId: dispute.jobId,
          paymentId: dispute.paymentId,
          amountRefunded,
          error: txError,
        });
        return createApiResponse(false, null, 'Database update failed after refund was processed. Contact support for reconciliation.', 500);
      }

      // Reliability score update (outside transaction — non-critical)
      await updateGuardReliabilityScore(dispute.guardUid).catch(err => 
        console.error('Failed to update reliability score:', err)
      );

    // ─── PARTIAL Decision ────────────────────────────────────────────────────
    } else if (decision === AdminDecision.PARTIAL) {
      amountReleased = adminDecisionAmount;
      amountRefunded = payment.totalChargedToBoss - amountReleased;

      // Phase 1: External partial refund
      try {
        if (payment.paymentMethod === PaymentMethod.STRIPE && payment.stripePaymentIntentId) {
          const stripe = await getStripeInstance();
          await stripe.refunds.create({ 
            payment_intent: payment.stripePaymentIntentId,
            amount: Math.round(amountRefunded * 100) // Stripe takes cents
          });
        } else if (payment.paymentMethod === PaymentMethod.PAYPAL && payment.paypalCaptureId) {
          const config = await getPayPalConfig();
          const accessToken = await getPayPalAccessToken();
          const refundResp = await fetch(`${config.baseUrl}/v2/payments/captures/${payment.paypalCaptureId}/refund`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: { value: amountRefunded.toFixed(2), currency_code: payment.currency || 'AUD' }
            })
          });
          if (!refundResp.ok) {
            const refundError = await refundResp.text();
            throw new Error(`PayPal partial refund failed: ${refundError}`);
          }
        }
      } catch (refundError: any) {
        console.error('External partial refund failed:', refundError);
        return createApiResponse(false, null, `Partial refund failed: ${refundError.message}`, 400);
      }

      // Phase 2: All DB updates in a transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // Verify guard wallet has sufficient pending balance
        const wallet = await GuardWallet.findOne({ guardUid: dispute.guardUid }).session(session);
        if (wallet && wallet.pendingBalance < guardAmount) {
          console.error(`[PARTIAL] Guard ${dispute.guardUid} pendingBalance (${wallet.pendingBalance}) < guardAmount (${guardAmount}). Clamping.`);
          const actualDeduction = Math.min(wallet.pendingBalance, guardAmount);
          await GuardWallet.updateOne(
            { guardUid: dispute.guardUid },
            { 
              $inc: { 
                availableBalance: amountReleased,
                totalEarned: amountReleased
              },
              $set: { pendingBalance: Math.max(0, wallet.pendingBalance - actualDeduction) }
            }
          ).session(session);
        } else {
          await GuardWallet.updateOne(
            { guardUid: dispute.guardUid },
            { 
              $inc: { 
                pendingBalance: -guardAmount,
                availableBalance: amountReleased,
                totalEarned: amountReleased
              }
            }
          ).session(session);
        }

        // Update Payment
        payment.paymentStatus = EscrowPaymentStatus.RELEASED;
        await payment.save({ session });
        
        // Update Job
        await Job.updateOne(
          { jobId: dispute.jobId }, 
          { $set: { paymentStatus: JobPaymentStatus.RELEASED } }
        ).session(session);

        // Both parties get a strike
        await User.updateOne(
          { uid: dispute.bossUid }, 
          { $inc: { cancellationStrikes: 1 } }
        ).session(session);
        await User.updateOne(
          { uid: dispute.guardUid }, 
          { $inc: { cancellationStrikes: 1 } }
        ).session(session);

        // Update Dispute
        dispute.adminDecision = decision;
        dispute.adminNotes = adminNotes;
        dispute.adminDecisionAmount = amountReleased;
        dispute.resolvedBy = user.uid;
        dispute.resolvedAt = new Date();
        dispute.status = DisputeStatus.RESOLVED;
        await dispute.save({ session });

        await session.commitTransaction();
        session.endSession();
      } catch (txError) {
        await session.abortTransaction();
        session.endSession();
        // CRITICAL: External refund succeeded but DB failed
        console.error('CRITICAL: Partial refund succeeded externally but DB transaction failed. Manual reconciliation needed.', {
          disputeId: params.id,
          jobId: dispute.jobId,
          paymentId: dispute.paymentId,
          amountReleased,
          amountRefunded,
          error: txError,
        });
        return createApiResponse(false, null, 'Database update failed after partial refund was processed. Contact support for reconciliation.', 500);
      }

      // Reliability score update (outside transaction — non-critical)
      await updateGuardReliabilityScore(dispute.guardUid).catch(err => 
        console.error('Failed to update reliability score:', err)
      );
    }

    // ─── Post-resolution: Send email notifications (fire-and-forget) ─────────
    const boss = await User.findOne({ uid: dispute.bossUid }).lean();
    const guard = await User.findOne({ uid: dispute.guardUid }).lean();

    if (boss && guard) {
      await sendDisputeResolved(boss.email, `${boss.firstName} ${boss.lastName}`, dispute.jobTitle, decision, amountReleased, amountRefunded, adminNotes, payment.currency || 'AUD');
      await sendDisputeResolved(guard.email, `${guard.firstName} ${guard.lastName}`, dispute.jobTitle, decision, amountReleased, amountRefunded, adminNotes, payment.currency || 'AUD');
    }

    // Email admin
    await sendDisputeResolvedAdmin(user.email, dispute.jobTitle, decision, `${user.firstName} ${user.lastName}`, dispute._id.toString());

    return createApiResponse(true, dispute.toObject(), 'Dispute resolved successfully.', 200);
  } catch (error: any) {
    console.error('PATCH /api/disputes/[id]/resolve error:', error);
    return createApiResponse(false, null, error.message || 'Failed to resolve dispute.', 500);
  }
}
