import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";
import { getPayPalAccessToken, getPayPalConfig } from "@/lib/payments/paypalClient";

/**
 * POST /api/subscriptions/cancel
 * Boss only — cancel subscription at period end.
 * Also cancels the underlying Stripe/PayPal subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can cancel subscriptions.", 403);
    }

    await connectDB();

    const subscription = await BossSubscription.findOne({ bossUid: user.uid });
    if (!subscription) {
      return createApiResponse(false, null, "No subscription found.", 404);
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return createApiResponse(false, null, "Subscription is already cancelled.", 400);
    }

    // ── Cancel in Stripe ─────────────────────────────────────────────────
    if (subscription.stripeSubscriptionId) {
      try {
        const stripe = await getStripeInstance();
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (err: any) {
        console.warn('Failed to cancel Stripe subscription:', err.message);
      }
    }

    // ── Cancel in PayPal ─────────────────────────────────────────────────
    if (subscription.paypalSubscriptionId) {
      try {
        const accessToken = await getPayPalAccessToken();
        const config = await getPayPalConfig();
        await fetch(`${config.baseUrl}/v1/billing/subscriptions/${subscription.paypalSubscriptionId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'Boss cancelled from GuardMate dashboard' }),
        });
      } catch (err: any) {
        console.warn('Failed to cancel PayPal subscription:', err.message);
      }
    }

    // ── Update DB ────────────────────────────────────────────────────────
    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    await subscription.save();

    // ── Send cancellation email ──────────────────────────────────────────
    try {
      const { sendSubscriptionCancelled } = await import('@/lib/email/emailTriggers');
      const User = (await import('@/models/User.model')).default;
      const boss = await User.findOne({ uid: user.uid }).lean();
      if (boss?.email) {
        const activeUntil = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'N/A';
        await sendSubscriptionCancelled(boss.email, boss.firstName, activeUntil);
      }
    } catch (e) {
      console.warn('Failed to send cancellation email:', e);
    }

    return createApiResponse(true, {
      status: subscription.status,
      cancelledAt: subscription.cancelledAt,
      activeUntil: subscription.currentPeriodEnd,
    }, "Subscription cancelled. It will remain active until the current period ends.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to cancel subscription.";
    console.error("Subscription Cancel Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
