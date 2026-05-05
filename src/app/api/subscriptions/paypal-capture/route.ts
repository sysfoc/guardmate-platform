import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import { getPayPalAccessToken, getPayPalConfig } from "@/lib/payments/paypalClient";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/paypal-capture
// Boss confirms PayPal subscription after returning from PayPal approval.
// Verifies subscription is ACTIVE and updates BossSubscription record.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts.", 403);
    }

    const { subscriptionId } = await request.json();
    if (!subscriptionId) {
      return createApiResponse(false, null, "subscriptionId is required.", 400);
    }

    await connectDB();

    // ── Verify subscription status with PayPal ─────────────────────────────
    const accessToken = await getPayPalAccessToken();
    const config = await getPayPalConfig();

    const verifyRes = await fetch(`${config.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error('PayPal Subscription Verify Error:', errText);
      return createApiResponse(false, null, "Failed to verify PayPal subscription.", 500);
    }

    const paypalSub = await verifyRes.json();

    if (paypalSub.status !== 'ACTIVE') {
      return createApiResponse(false, null, `PayPal subscription is not active. Status: ${paypalSub.status}`, 400);
    }

    // ── Update BossSubscription ────────────────────────────────────────────
    const sub = await BossSubscription.findOne({ bossUid: user.uid });
    if (!sub) {
      return createApiResponse(false, null, "No subscription record found.", 404);
    }

    const now = new Date();
    const periodEnd = paypalSub.billing_info?.next_billing_time
      ? new Date(paypalSub.billing_info.next_billing_time)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    sub.status = SubscriptionStatus.ACTIVE;
    sub.paypalSubscriptionId = subscriptionId;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = periodEnd;
    sub.lastPaymentAt = now;
    sub.lastPaymentAmount = sub.amount;
    sub.cancelledAt = null;
    sub.failedPaymentAt = null;
    sub.failureReason = null;
    await sub.save();

    // ── Send activation email ──────────────────────────────────────────────
    try {
      const { sendSubscriptionActivated } = await import('@/lib/email/emailTriggers');
      const User = (await import('@/models/User.model')).default;
      const boss = await User.findOne({ uid: user.uid }).lean();
      if (boss?.email) {
        await sendSubscriptionActivated(
          boss.email,
          boss.firstName,
          sub.amount || 0,
          'AUD',
          now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
          periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        );
      }
    } catch (e) {
      console.warn('Failed to send activation email:', e);
    }

    return createApiResponse(true, {
      status: sub.status,
      periodEnd: periodEnd.toISOString(),
    }, "PayPal subscription activated successfully.", 200);
  } catch (error: any) {
    console.error("PayPal Capture Error:", error);
    return createApiResponse(false, null, error.message || "Failed to capture subscription.", 500);
  }
}
