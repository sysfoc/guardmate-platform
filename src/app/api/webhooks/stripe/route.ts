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
          await payment.save();
          
          await Job.updateOne({ jobId: payment.jobId }, { $set: { paymentStatus: JobPaymentStatus.DISPUTED } });

          const PlatformDispute = (await import('@/models/Dispute.model')).default;
          const { sendDisputeRaisedAdmin } = await import('@/lib/email/emailTriggers');
          const User = (await import('@/models/User.model')).default;
          
          let platformDispute = await PlatformDispute.findOne({ paymentId: payment._id });
          
          if (platformDispute) {
            platformDispute.chargebackRaised = true;
            platformDispute.chargebackId = dispute.id;
            await platformDispute.save();
          } else {
            const disputeDeadline = new Date(new Date().getTime() + 48 * 60 * 60 * 1000); // generic deadline
            
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
              description: 'Stripe chargeback filed by client.',
              status: 'OPEN',
              disputeDeadline,
              chargebackRaised: true,
              chargebackId: dispute.id
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
              'STRIPE CHARGEBACK ALSO FILED — 7 DAY RESPONSE DEADLINE',
              payment.jobBudget,
              payment.currency || 'AUD',
              platformDispute._id.toString()
            ).catch(console.error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // ─── Subscription Billing Events ──────────────────────────────────────
    // These are handled separately to avoid conflicts with the escrow switch
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const BossSubscription = (await import('@/models/BossSubscription.model')).default;
        const { SubscriptionStatus } = await import('@/types/enums');

        const sub = await BossSubscription.findOne({ stripeSubscriptionId: subscriptionId });
        if (sub) {
          const periodEnd = invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          sub.status = SubscriptionStatus.ACTIVE;
          sub.currentPeriodStart = new Date();
          sub.currentPeriodEnd = periodEnd;
          sub.lastPaymentAt = new Date();
          sub.lastPaymentAmount = (invoice.amount_paid || 0) / 100;
          sub.failedPaymentAt = null;
          sub.failureReason = null;
          await sub.save();

          console.log(`Subscription ACTIVE for boss ${sub.bossUid}`);

          // Send activation email
          try {
            const { sendSubscriptionActivated } = await import('@/lib/email/emailTriggers');
            const User = (await import('@/models/User.model')).default;
            const boss = await User.findOne({ uid: sub.bossUid }).lean();
            if (boss?.email) {
              await sendSubscriptionActivated(
                boss.email,
                boss.firstName,
                sub.amount || 0,
                'AUD',
                new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
                periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
              );
            }
          } catch (e) {
            console.warn('Failed to send subscription activation email:', e);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const BossSubscription = (await import('@/models/BossSubscription.model')).default;
        const { SubscriptionStatus } = await import('@/types/enums');

        const sub = await BossSubscription.findOne({ stripeSubscriptionId: subscriptionId });
        if (sub) {
          sub.status = SubscriptionStatus.LAPSED;
          sub.failedPaymentAt = new Date();
          sub.failureReason = invoice.last_finalization_error?.message || 'Payment failed';
          await sub.save();

          console.log(`Subscription LAPSED for boss ${sub.bossUid}`);

          // Send payment failed email
          try {
            const { sendSubscriptionPaymentFailed } = await import('@/lib/email/emailTriggers');
            const User = (await import('@/models/User.model')).default;
            const boss = await User.findOne({ uid: sub.bossUid }).lean();
            if (boss?.email) {
              await sendSubscriptionPaymentFailed(
                boss.email,
                boss.firstName,
                sub.amount || 0,
                'AUD',
                sub.failureReason || 'Payment declined',
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/subscription`
              );
            }
          } catch (e) {
            console.warn('Failed to send payment failed email:', e);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object as any;
        const BossSubscription = (await import('@/models/BossSubscription.model')).default;
        const { SubscriptionStatus } = await import('@/types/enums');

        const sub = await BossSubscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
        if (sub && sub.status !== SubscriptionStatus.CANCELLED) {
          sub.status = SubscriptionStatus.CANCELLED;
          sub.cancelledAt = new Date();
          await sub.save();

          console.log(`Subscription CANCELLED via Stripe for boss ${sub.bossUid}`);

          try {
            const { sendSubscriptionCancelled } = await import('@/lib/email/emailTriggers');
            const User = (await import('@/models/User.model')).default;
            const boss = await User.findOne({ uid: sub.bossUid }).lean();
            if (boss?.email) {
              const activeUntil = sub.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A';
              await sendSubscriptionCancelled(boss.email, boss.firstName, activeUntil);
            }
          } catch (e) {
            console.warn('Failed to send cancellation email:', e);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
