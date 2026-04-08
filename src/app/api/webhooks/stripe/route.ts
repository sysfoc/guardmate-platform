import { NextRequest, NextResponse } from "next/server";
import { getStripeInstance, getStripeWebhookSecret } from "@/lib/payments/stripeClient";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import Job from "@/models/Job.model";
import GuardWallet from "@/models/GuardWallet.model";
import { EscrowPaymentStatus, JobPaymentStatus } from "@/types/enums";
import { sendEmail } from "@/lib/email/sendEmail";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const stripe = await getStripeInstance();
    const webhookSecret = await getStripeWebhookSecret();
    const body = await request.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Stripe Webhook Received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as any;
        const paymentId = paymentIntent.metadata?.paymentId;

        if (paymentId) {
          const payment = await Payment.findById(paymentId);
          if (payment && payment.paymentStatus === EscrowPaymentStatus.PENDING) {
            payment.paymentStatus = EscrowPaymentStatus.HELD;
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

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as any;
        const paymentId = paymentIntent.metadata?.paymentId;

        if (paymentId) {
          const payment = await Payment.findById(paymentId);
          if (payment && payment.paymentStatus === EscrowPaymentStatus.PENDING) {
            payment.paymentStatus = EscrowPaymentStatus.FAILED;
            await payment.save();
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as any;
        const paymentIntentId = dispute.payment_intent;

        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
        if (payment) {
          payment.paymentStatus = EscrowPaymentStatus.DISPUTED;
          payment.disputeId = dispute.id;
          await payment.save();
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
