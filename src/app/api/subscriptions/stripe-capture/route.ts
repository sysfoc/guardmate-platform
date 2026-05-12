import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/stripe-capture
// Boss confirms Stripe subscription after client-side card payment succeeds.
// Verifies subscription is ACTIVE (or latest invoice paid) and updates record.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    console.log('[stripe-capture] Authenticated bossUid:', user.uid);
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts.", 403);
    }

    const { subscriptionId } = await request.json();
    console.log('[stripe-capture] 📥 Request body subscriptionId:', subscriptionId);
    if (!subscriptionId) {
      return createApiResponse(false, null, "subscriptionId is required.", 400);
    }

    await connectDB();

    // ── Find local subscription record ──────────────────────────────────────
    const sub = await BossSubscription.findOne({
      bossUid: user.uid,
      stripeSubscriptionId: subscriptionId,
    });
    console.log('[stripe-capture] 🔍 Local DB record found:', !!sub, '| current status:', sub?.status, '| amount:', sub?.amount);
    if (!sub) {
      return createApiResponse(false, null, "No subscription record found.", 404);
    }

    // ── Verify with Stripe ──────────────────────────────────────────────────
    const stripe = await getStripeInstance();
    console.log('[stripe-capture] 💳 Retrieving Stripe subscription:', subscriptionId);
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    });
    console.log('[stripe-capture] 📊 Stripe subscription status:', stripeSub.status, '| latest_invoice status:', (stripeSub as any).latest_invoice?.status);

    const latestInvoice = (stripeSub as any).latest_invoice;
    const isPaid =
      stripeSub.status === "active" ||
      stripeSub.status === "trialing" ||
      (latestInvoice && (latestInvoice.status === "paid" || latestInvoice.status === "open"));
    console.log('[stripe-capture] 💰 isPaid evaluation:', isPaid, '| stripeSub.status:', stripeSub.status, '| invoice.status:', latestInvoice?.status);

    if (!isPaid) {
      console.warn('[stripe-capture] ❌ Subscription NOT paid. Returning 400.');
      return createApiResponse(
        false,
        null,
        `Stripe subscription is not active. Status: ${stripeSub.status}`,
        400
      );
    }

    // ── Update BossSubscription ─────────────────────────────────────────────
    const now = new Date();
    const periodEnd = (stripeSub as any).current_period_end
      ? new Date((stripeSub as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    sub.status = SubscriptionStatus.ACTIVE;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = periodEnd;
    sub.lastPaymentAt = now;
    sub.lastPaymentAmount = sub.amount;
    sub.failedPaymentAt = null;
    sub.failureReason = null;
    await sub.save();
    console.log('[stripe-capture] ✅ DB updated to ACTIVE. Period end:', periodEnd.toISOString(), '| lastPaymentAt:', now.toISOString());

    // ── Consume offer if present ────────────────────────────────────────────
    if (sub.appliedOfferId) {
      try {
        const UserOffer = (await import("@/models/UserOffer.model")).default;
        const Offer = (await import("@/models/Offer.model")).default;
        const userOffer = await UserOffer.findOne({
          userUid: sub.bossUid,
          offerId: sub.appliedOfferId,
        });
        if (userOffer && !userOffer.usedAt) {
          userOffer.usedAt = now;
          await userOffer.save();
          await Offer.updateOne(
            { _id: sub.appliedOfferId },
            { $inc: { usageCount: 1 } }
          );
        }
      } catch (e) {
        console.warn("Failed to consume offer after Stripe capture:", e);
      }
    }

    // ── Send activation email ───────────────────────────────────────────────
    try {
      const { sendSubscriptionActivated } = await import("@/lib/email/emailTriggers");
      const User = (await import("@/models/User.model")).default;
      const boss = await User.findOne({ uid: user.uid }).lean();
      if (boss?.email) {
        await sendSubscriptionActivated(
          boss.email,
          boss.firstName,
          sub.amount || 0,
          "AUD",
          now.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          periodEnd.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        );
      }
    } catch (e) {
      console.warn("Failed to send activation email:", e);
    }

    console.log('[stripe-capture] 📤 Returning success response — status:', sub.status);
    return createApiResponse(
      true,
      {
        status: sub.status,
        periodEnd: periodEnd.toISOString(),
      },
      "Stripe subscription activated successfully.",
      200
    );
  } catch (error: any) {
    console.error('[stripe-capture] ❌ FATAL ERROR:', error?.message || error, '| stack:', error?.stack);
    return createApiResponse(
      false,
      null,
      error.message || "Failed to capture subscription.",
      500
    );
  }
}
