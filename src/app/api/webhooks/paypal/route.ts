import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import Job from "@/models/Job.model";
import UserOffer from "@/models/UserOffer.model";
import Offer from "@/models/Offer.model";
import { EscrowPaymentStatus, JobPaymentStatus, DiscountType } from "@/types/enums";
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
                payment.currency || '$',
                platformDispute._id.toString()
              ).catch(console.error);
            }
          }
        }
        break;
      }

      // ─── Subscription: Subscription Activated/Renewed ────────────────────
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RENEWED": {
        const resource = event.resource;
        const paypalSubId = resource.id;
        const customId = resource.custom_id; // bossUid

        if (paypalSubId) {
          const BossSubscription = (await import('@/models/BossSubscription.model')).default;
          const { SubscriptionStatus } = await import('@/types/enums');

          const sub = await BossSubscription.findOne({
            $or: [
              { paypalSubscriptionId: paypalSubId },
              ...(customId ? [{ bossUid: customId }] : []),
            ],
          });

          if (sub) {
            const nextBilling = resource.billing_info?.next_billing_time
              ? new Date(resource.billing_info.next_billing_time)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            sub.status = SubscriptionStatus.ACTIVE;
            sub.paypalSubscriptionId = paypalSubId;
            sub.currentPeriodStart = new Date();
            sub.currentPeriodEnd = nextBilling;
            sub.lastPaymentAt = new Date();
            sub.lastPaymentAmount = sub.amount;
            sub.failedPaymentAt = null;
            sub.failureReason = null;
            await sub.save();

            console.log(`PayPal Subscription ACTIVE for boss ${sub.bossUid}`);

            // ─── Consume the offer that was used for this payment ───────────────
            if (sub.appliedOfferId) {
              const userOffer = await UserOffer.findOne({ userUid: sub.bossUid, offerId: sub.appliedOfferId });
              if (userOffer && !userOffer.usedAt) {
                userOffer.usedAt = new Date();
                await userOffer.save();
                await Offer.updateOne({ _id: sub.appliedOfferId }, { $inc: { usageCount: 1 } });
                console.log(`Offer ${sub.appliedOfferId} marked as used for boss ${sub.bossUid}`);
              }
            }

            // ─── Calculate next period amount (dynamic pricing + next offer) ────
            try {
              const settings = await PlatformSettings.findOne().lean();
              const baseAmount = settings?.bossSubscriptionAmount ?? 0;
              let nextAmount = baseAmount;
              let nextOfferId: string | null = null;

              if (baseAmount > 0) {
                const now = new Date();
                const bossAcquired = await UserOffer.find({ userUid: sub.bossUid, usedAt: null }).lean();
                if (bossAcquired.length > 0) {
                  const offerIds = bossAcquired.map((r) => r.offerId);
                  const offers = await Offer.find({
                    _id: { $in: offerIds },
                    isActive: true,
                    startDate: { $lte: now },
                    endDate: { $gte: now },
                  }).lean();
                  const offer = offers[0];
                  if (offer) {
                    nextOfferId = String(offer._id);
                    if (offer.discountType === DiscountType.FULL_WAIVER) {
                      nextAmount = 0;
                    } else if (offer.discountType === DiscountType.PERCENTAGE_OFF && offer.discountValue != null) {
                      nextAmount = Math.round(baseAmount * (1 - offer.discountValue / 100) * 100) / 100;
                    } else if (offer.discountType === DiscountType.FIXED_RATE && offer.discountValue != null) {
                      nextAmount = Math.max(0, offer.discountValue);
                    }
                  }
                }
              }

              // Update PayPal subscription with new plan for next period
              if (nextAmount !== sub.amount) {
                const accessToken = await getPayPalAccessToken();
                const config = await getPayPalConfig();

                // Create a new product (or reuse existing)
                const productRes = await fetch(`${config.baseUrl}/v1/catalogs/products`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'PayPal-Request-Id': `gm-boss-sub-product-${Date.now()}`,
                  },
                  body: JSON.stringify({
                    name: 'GuardMate Boss Monthly Subscription',
                    description: 'Monthly subscription for posting jobs on GuardMate',
                    type: 'SERVICE',
                    category: 'SOFTWARE',
                  }),
                });
                let productId: string | undefined;
                if (productRes.ok) {
                  const product = await productRes.json();
                  productId = product.id;
                } else {
                  // Fallback: try to find existing product
                  const productsRes = await fetch(`${config.baseUrl}/v1/catalogs/products?page_size=20&total_required=true`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                  });
                  if (productsRes.ok) {
                    const products = await productsRes.json();
                    const existing = products.products?.find((p: any) => p.name === 'GuardMate Boss Monthly Subscription');
                    productId = existing?.id;
                  }
                }

                if (productId) {
                  // Create a new plan with updated amount
                  const planRes = await fetch(`${config.baseUrl}/v1/billing/plans`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                      'PayPal-Request-Id': `gm-boss-sub-plan-${Date.now()}`,
                    },
                    body: JSON.stringify({
                      product_id: productId,
                      name: 'GuardMate Monthly Plan',
                      description: `AUD ${nextAmount.toFixed(2)}/month boss subscription`,
                      status: 'ACTIVE',
                      billing_cycles: [
                        {
                          frequency: { interval_unit: 'MONTH', interval_count: 1 },
                          tenure_type: 'REGULAR',
                          sequence: 1,
                          total_cycles: 0,
                          pricing_scheme: {
                            fixed_price: { value: nextAmount.toFixed(2), currency_code: 'AUD' },
                          },
                        },
                      ],
                      payment_preferences: {
                        auto_bill_outstanding: true,
                        payment_failure_threshold: 3,
                      },
                    }),
                  });

                  if (planRes.ok) {
                    const plan = await planRes.json();
                    // Update subscription to use new plan
                    const patchRes = await fetch(`${config.baseUrl}/v1/billing/subscriptions/${paypalSubId}`, {
                      method: 'PATCH',
                      headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'PayPal-Request-Id': `gm-boss-sub-patch-${Date.now()}`,
                      },
                      body: JSON.stringify([
                        {
                          op: 'replace',
                          path: '/plan_id',
                          value: plan.id,
                        },
                      ]),
                    });
                    if (patchRes.ok) {
                      console.log(`Updated PayPal subscription ${paypalSubId} to new plan ${plan.id} with amount ${nextAmount}`);
                    } else {
                      console.error('PayPal subscription patch failed:', await patchRes.text());
                    }
                  } else {
                    console.error('PayPal plan creation failed:', await planRes.text());
                  }
                }
              }

              // Update BossSubscription with next period's amount and offer
              await BossSubscription.updateOne(
                { _id: sub._id },
                { $set: { amount: nextAmount, appliedOfferId: nextOfferId } }
              );
            } catch (pricingErr: any) {
              console.error('Failed to update PayPal subscription for next period:', pricingErr.message);
            }

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
                  '$',
                  new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
                  nextBilling.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                );
              }
            } catch (e) {
              console.warn('Failed to send subscription activation email:', e);
            }
          }
        }
        break;
      }

      // ─── Subscription: Payment Failed ──────────────────────────────────
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const resource = event.resource;
        const paypalSubId = resource.id;

        if (paypalSubId) {
          const BossSubscription = (await import('@/models/BossSubscription.model')).default;
          const { SubscriptionStatus } = await import('@/types/enums');

          const sub = await BossSubscription.findOne({ paypalSubscriptionId: paypalSubId });
          if (sub) {
            sub.status = SubscriptionStatus.LAPSED;
            sub.failedPaymentAt = new Date();
            sub.failureReason = 'PayPal payment failed';
            await sub.save();

            console.log(`PayPal Subscription LAPSED for boss ${sub.bossUid}`);

            try {
              const { sendSubscriptionPaymentFailed } = await import('@/lib/email/emailTriggers');
              const User = (await import('@/models/User.model')).default;
              const boss = await User.findOne({ uid: sub.bossUid }).lean();
              if (boss?.email) {
                await sendSubscriptionPaymentFailed(
                  boss.email,
                  boss.firstName,
                  sub.amount || 0,
                  '$',
                  'PayPal payment declined',
                  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/subscription`
                );
              }
            } catch (e) {
              console.warn('Failed to send payment failed email:', e);
            }
          }
        }
        break;
      }

      // ─── Subscription: Cancelled/Suspended ─────────────────────────────
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const resource = event.resource;
        const paypalSubId = resource.id;

        if (paypalSubId) {
          const BossSubscription = (await import('@/models/BossSubscription.model')).default;
          const { SubscriptionStatus } = await import('@/types/enums');

          const sub = await BossSubscription.findOne({ paypalSubscriptionId: paypalSubId });
          if (sub && sub.status !== SubscriptionStatus.CANCELLED) {
            sub.status = SubscriptionStatus.CANCELLED;
            sub.cancelledAt = new Date();
            await sub.save();

            console.log(`PayPal Subscription CANCELLED for boss ${sub.bossUid}`);

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
