import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import GuardWallet from "@/models/GuardWallet.model";
import Withdrawal from "@/models/Withdrawal.model";
import Job from "@/models/Job.model";
import { EscrowPaymentStatus, WithdrawalStatus, JobPaymentStatus } from "@/types/enums";
import { getPayPalAccessToken, getPayPalConfig } from "@/lib/payments/paypalClient";
import PlatformSettings from "@/models/PlatformSettings.model";

// ─────────────────────────────────────────────────────────────────────────────
// PayPal Webhook — with signature verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify PayPal webhook signature using the PayPal Notifications API.
 * Returns true if valid, false otherwise.
 */
async function verifyPayPalWebhook(
  request: NextRequest,
  bodyText: string
): Promise<boolean> {
  try {
    const settings = await PlatformSettings.findOne().lean();
    const webhookId = settings?.paypalWebhookId;

    // If no webhook ID is configured, log a warning but allow (dev/sandbox mode)
    if (!webhookId) {
      console.warn("PayPal webhook verification skipped: no paypalWebhookId configured in PlatformSettings.");
      return true;
    }

    const accessToken = await getPayPalAccessToken();
    const config = await getPayPalConfig();

    const verifyPayload = {
      auth_algo: request.headers.get("paypal-auth-algo") || "",
      cert_url: request.headers.get("paypal-cert-url") || "",
      transmission_id: request.headers.get("paypal-transmission-id") || "",
      transmission_sig: request.headers.get("paypal-transmission-sig") || "",
      transmission_time: request.headers.get("paypal-transmission-time") || "",
      webhook_id: webhookId,
      webhook_event: JSON.parse(bodyText),
    };

    const response = await fetch(`${config.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verifyPayload),
    });

    if (!response.ok) {
      console.error("PayPal webhook verification API error:", await response.text());
      return false;
    }

    const result = await response.json();
    return result.verification_status === "SUCCESS";
  } catch (err: any) {
    console.error("PayPal webhook verify exception:", err.message);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const bodyText = await request.text();

    // ─── Signature Verification ──────────────────────────────────────────────
    const isValid = await verifyPayPalWebhook(request, bodyText);
    if (!isValid) {
      console.error("PayPal webhook signature verification FAILED.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(bodyText);
    console.log(`PayPal Webhook Received: ${event.event_type}`);

    switch (event.event_type) {
      // ─── Escrow: Payment Capture Completed ───────────────────────────────
      case "PAYMENT.CAPTURE.COMPLETED": {
        const resource = event.resource;
        const purchaseUnit = resource.purchase_units?.[0];
        const paymentId = purchaseUnit?.reference_id;

        if (paymentId) {
          const payment = await Payment.findById(paymentId);
          if (payment && payment.paymentStatus === EscrowPaymentStatus.PENDING) {
            payment.paymentStatus = EscrowPaymentStatus.HELD;
            payment.paypalCaptureId = resource.id;
            payment.heldAt = new Date();
            await payment.save();

            // Update Job payment status
            const job = await Job.findOneAndUpdate(
              { jobId: payment.jobId },
              { $set: { paymentStatus: JobPaymentStatus.HELD } },
              { new: true }
            );

            console.log(`Payment HELD for job ${payment.jobId}`);

            if (job && job.status === 'FILLED') {
              // Notify guards that the shift is confirmed!
              const { sendBidAccepted, sendBidRejected } = await import('@/lib/email/emailTriggers');
              const User = (await import('@/models/User.model')).default;
              const Bid = (await import('@/models/Bid.model')).default;

              const boss = await User.findOne({ uid: job.postedBy }).lean();
              const bossName = boss ? `${boss.firstName} ${boss.lastName}` : 'The Company';

              // Rejected bids
              const rejectedBids = await Bid.find({ jobId: job.jobId, status: 'REJECTED' }).lean();
              for (const rBid of rejectedBids) {
                try {
                  const g = await User.findOne({ uid: rBid.guardUid }).lean();
                  if (g?.email) {
                    await sendBidRejected(g.email, g.firstName, job.title, bossName);
                  }
                } catch (e) {
                  console.warn('Failed to send rejection email:', e);
                }
              }

              // Accepted bids
              const acceptedBids = await Bid.find({ jobId: job.jobId, status: 'ACCEPTED' }).lean();
              for (const aBid of acceptedBids) {
                try {
                  const g = await User.findOne({ uid: aBid.guardUid }).lean();
                  if (g?.email) {
                    await sendBidAccepted(
                      g.email,
                      g.firstName,
                      job.title,
                      bossName,
                      new Date(job.startDate).toISOString().split('T')[0],
                      job.location,
                      aBid.proposedRate
                    );
                  }
                } catch (e) {
                  console.warn('Failed to send accepted email:', e);
                }
              }
            }
          }
        }
        break;
      }

      // ─── Escrow: Payment Capture Denied ──────────────────────────────────
      case "PAYMENT.CAPTURE.DENIED": {
        console.log("PayPal Capture Denied:", event.resource);
        break;
      }

      // ─── Escrow: Dispute Created ─────────────────────────────────────────
      case "CUSTOMER.DISPUTE.CREATED": {
        const resource = event.resource;
        const transactionId = resource.disputed_transactions?.[0]?.seller_transaction_id;

        if (transactionId) {
          const payment = await Payment.findOne({ paypalCaptureId: transactionId });
          if (payment) {
            payment.paymentStatus = EscrowPaymentStatus.DISPUTED;
            await payment.save();
            
            await Job.updateOne({ jobId: payment.jobId }, { $set: { paymentStatus: JobPaymentStatus.DISPUTED } });

            const PlatformDispute = (await import('@/models/Dispute.model')).default;
            const { sendDisputeRaisedAdmin } = await import('@/lib/email/emailTriggers');
            const User = (await import('@/models/User.model')).default;
            
            let platformDispute = await PlatformDispute.findOne({ paymentId: payment._id });
            
            if (platformDispute) {
              platformDispute.chargebackRaised = true;
              platformDispute.chargebackId = resource.dispute_id;
              await platformDispute.save();
            } else {
              const disputeDeadline = new Date(new Date().getTime() + 48 * 60 * 60 * 1000); // 48h
              
              platformDispute = await PlatformDispute.create({
                jobId: payment.jobId,
                paymentId: payment._id.toString(),
                raisedByUid: payment.bossUid,
                raisedByRole: 'BOSS',
                againstUid: payment.guardUid,
                againstRole: 'MATE',
                jobTitle: payment.jobTitle,
                bossUid: payment.bossUid,
                guardUid: payment.guardUid,
                reason: 'PAYMENT_DISPUTE',
                description: 'PayPal chargeback filed by client.',
                status: 'OPEN',
                disputeDeadline,
                chargebackRaised: true,
                chargebackId: resource.dispute_id
              });
              payment.disputeId = platformDispute._id.toString();
              await payment.save();
            }

            // Notify admins
            const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('email').lean();
            const boss = await User.findOne({ uid: payment.bossUid }).lean();
            const guard = await User.findOne({ uid: payment.guardUid }).lean();
            
            for (const admin of admins) {
              await sendDisputeRaisedAdmin(
                admin.email,
                boss ? `${boss.firstName} ${boss.lastName}` : 'Boss',
                'BOSS',
                guard ? `${guard.firstName} ${guard.lastName}` : 'Guard',
                payment.jobTitle,
                'PAYMENT_DISPUTE',
                'PAYPAL CHARGEBACK ALSO FILED — 7 DAY RESPONSE DEADLINE',
                payment.jobBudget,
                payment.currency || 'AUD',
                platformDispute._id.toString()
              ).catch(console.error);
            }
          }
        }
        break;
      }

      // ─── Withdrawals: Payout Item Succeeded ──────────────────────────────
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": {
        const resource = event.resource;
        // sender_item_id is set to the Withdrawal._id when we create the payout
        const withdrawalId = resource.payout_item?.sender_item_id;

        if (withdrawalId) {
          const withdrawal = await Withdrawal.findById(withdrawalId);
          if (withdrawal && withdrawal.status === WithdrawalStatus.PROCESSING) {
            withdrawal.status = WithdrawalStatus.COMPLETED;
            withdrawal.completedAt = new Date();
            await withdrawal.save();

            // Finalize wallet balances
            const wallet = await GuardWallet.findOne({ guardUid: withdrawal.guardUid });
            if (wallet) {
              wallet.pendingBalance -= withdrawal.amount;
              wallet.totalWithdrawn += withdrawal.amount;
              wallet.lastPayoutAt = new Date();
              await wallet.save();
            }
          }
        }
        break;
      }

      // ─── Withdrawals: Payout Failed ──────────────────────────────────────
      case "PAYMENT.PAYOUTSBATCH.DENIED":
      case "PAYMENT.PAYOUTS-ITEM.FAILED": {
        const resource = event.resource;
        // Always use sender_item_id — this maps to our Withdrawal._id
        // Do NOT fall back to payout_batch_id (that's PayPal's internal batch ID)
        const withdrawalId = resource.payout_item?.sender_item_id;

        if (!withdrawalId) {
          console.warn("PayPal payout failure webhook missing sender_item_id, cannot match withdrawal.");
          break;
        }

        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (withdrawal && withdrawal.status !== WithdrawalStatus.FAILED) {
          withdrawal.status = WithdrawalStatus.FAILED;
          withdrawal.failureReason = resource.errors?.message || "Payout failed via PayPal webhook";
          await withdrawal.save();

          // Revert wallet balances — return funds from pending back to available
          const wallet = await GuardWallet.findOne({ guardUid: withdrawal.guardUid });
          if (wallet) {
            wallet.pendingBalance -= withdrawal.amount;
            wallet.availableBalance += withdrawal.amount;
            await wallet.save();
          }
        }
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("PayPal Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
