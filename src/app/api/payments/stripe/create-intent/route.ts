import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Job from "@/models/Job.model";
import Bid from "@/models/Bid.model";
import Payment from "@/models/Payment.model";
import PlatformSettings from "@/models/PlatformSettings.model";
import { JobStatus, HiringStatus, UserRole, PaymentMethod, EscrowPaymentStatus } from "@/types/enums";
import { getStripeInstance, calculatePaymentBreakdown } from "@/lib/payments/stripeClient";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can create payments.", 403);
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return createApiResponse(false, null, "Job ID is required.", 400);
    }

    await connectDB();

    // 1. Validate Job
    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, "Job not found.", 404);
    }
    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, "You can only fund your own jobs.", 403);
    }
    if (job.hiringStatus !== HiringStatus.FULLY_HIRED || job.status !== JobStatus.FILLED) {
      return createApiResponse(false, null, "Job must be fully hired before funding escrow.", 400);
    }
    if (!job.acceptedGuards || job.acceptedGuards.length === 0) {
      return createApiResponse(false, null, "No guards accepted for this job.", 400);
    }

    // Currently handling single guard for simplicity, but can be extended
    const guard = job.acceptedGuards[0];

    // Get the accepted bid to calculate proper amount
    const bid = await Bid.findOne({ bidId: guard.bidId });
    if (!bid) {
      return createApiResponse(false, null, "Accepted bid not found.", 404);
    }

    // Use the bid's totalProposed as the base amount (what guard will be paid)
    const baseAmount = bid.totalProposed || bid.proposedRate;

    // 2. Check existing payments
    const existingPayment = await Payment.findOne({ jobId, bossUid: user.uid });
    if (existingPayment && ["HELD", "RELEASED", "REFUNDED"].includes(existingPayment.paymentStatus)) {
      return createApiResponse(false, null, `Payment is already in status: ${existingPayment.paymentStatus}`, 400);
    }

    // 3. Get Platform Settings
    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.stripeEnabled) {
      return createApiResponse(false, null, "Stripe payments are not enabled on this platform.", 400);
    }

    const bossCommissionRate = settings.platformCommissionBoss || 0;
    const guardCommissionRate = settings.platformCommissionGuard || 0;
    const currency = settings.platformCurrency || "AUD";

    // 4. Calculate Amounts using the BID amount (not job budget)
    const breakdown = calculatePaymentBreakdown(baseAmount, bossCommissionRate, guardCommissionRate);

    // 5. Create/Update Payment Record
    let paymentDoc;
    if (existingPayment) {
      paymentDoc = existingPayment;
      // Update amounts in case settings/budget changed
      paymentDoc.jobBudget = baseAmount;
      paymentDoc.bossCommissionRate = bossCommissionRate;
      paymentDoc.guardCommissionRate = guardCommissionRate;
      paymentDoc.bossCommissionAmount = breakdown.bossCommissionAmount;
      paymentDoc.guardCommissionAmount = breakdown.guardCommissionAmount;
      paymentDoc.totalChargedToBoss = breakdown.totalChargedToBoss;
      paymentDoc.guardPayout = breakdown.guardPayout;
      paymentDoc.platformRevenue = breakdown.platformRevenue;
      paymentDoc.currency = currency;
      paymentDoc.paymentMethod = PaymentMethod.STRIPE;
      await paymentDoc.save();
    } else {
      paymentDoc = await Payment.create({
        jobId: job.jobId,
        bidId: guard.bidId,
        bossUid: user.uid,
        guardUid: guard.guardUid,
        jobTitle: job.title,
        jobBudget: baseAmount,
        bossCommissionRate,
        guardCommissionRate,
        bossCommissionAmount: breakdown.bossCommissionAmount,
        guardCommissionAmount: breakdown.guardCommissionAmount,
        totalChargedToBoss: breakdown.totalChargedToBoss,
        guardPayout: breakdown.guardPayout,
        platformRevenue: breakdown.platformRevenue,
        currency,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: EscrowPaymentStatus.PENDING,
      });
    }

    // 6. Create Stripe PaymentIntent
    const stripe = await getStripeInstance();
    // Use an idempotency key to prevent double charges if network drops
    const idempotencyKey = `pi_${paymentDoc._id}_${paymentDoc.totalChargedToBoss}`;

    const amountInCents = Math.round(paymentDoc.totalChargedToBoss * 100);

    let paymentIntent;
    if (paymentDoc.stripePaymentIntentId) {
      // Try to retrieve and update existing
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(paymentDoc.stripePaymentIntentId);
        if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_action') {
          if (existingIntent.amount !== amountInCents) {
            paymentIntent = await stripe.paymentIntents.update(paymentDoc.stripePaymentIntentId, {
              amount: amountInCents,
            });
          } else {
            paymentIntent = existingIntent;
          }
        } else {
            // Intent in a state that can't be updated, create new
            paymentIntent = await stripe.paymentIntents.create({
              amount: amountInCents,
              currency: currency.toLowerCase(),
              metadata: {
                paymentId: paymentDoc._id.toString(),
                jobId: job.jobId,
                bossUid: user.uid,
              },
            }, { idempotencyKey });
        }
      } catch (e) {
          // Fallback to create new
          paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency.toLowerCase(),
            metadata: {
              paymentId: paymentDoc._id.toString(),
              jobId: job.jobId,
              bossUid: user.uid,
            },
          }, { idempotencyKey });
      }
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          paymentId: paymentDoc._id.toString(),
          jobId: job.jobId,
          bossUid: user.uid,
        },
      }, { idempotencyKey });
    }

    // 7. Update Payment with Intent ID
    paymentDoc.stripePaymentIntentId = paymentIntent.id;
    await paymentDoc.save();

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        breakdown,
        currency,
      },
      message: "Payment Intent created."
    });

  } catch (error: any) {
    console.error("Stripe Create Intent Error:", error);
    return createApiResponse(false, null, error.message || "Failed to create payment intent.", 500);
  }
}
