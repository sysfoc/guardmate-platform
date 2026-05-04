import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import PlatformSettings from "@/models/PlatformSettings.model";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import { createPayPalOrder } from "@/lib/payments/paypalClient";

/**
 * POST /api/subscriptions/create-paypal
 * Boss only — create a PayPal order for the monthly subscription amount.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can subscribe.", 403);
    }

    await connectDB();

    const existing = await BossSubscription.findOne({ bossUid: user.uid });
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      return createApiResponse(false, null, "You already have an active subscription.", 400);
    }

    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.bossSubscriptionEnabled) {
      return createApiResponse(false, null, "Subscription is not required at this time.", 400);
    }
    if (!settings.paypalEnabled) {
      return createApiResponse(false, null, "PayPal payments are not enabled.", 400);
    }

    const amount = settings.bossSubscriptionAmount;
    if (!amount || amount <= 0) {
      return createApiResponse(false, null, "Subscription amount not configured.", 400);
    }

    const currency = (settings.bossSubscriptionCurrency || settings.platformCurrency || "AUD").toUpperCase();

    // Create PayPal order
    const { orderId, approvalUrl } = await createPayPalOrder(
      amount,
      currency,
      "GuardMate Boss Monthly Subscription",
      `boss_sub_${user.uid}_${Date.now()}`
    );

    // Create or update subscription record (pending payment capture)
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existing) {
      existing.status = SubscriptionStatus.ACTIVE;
      existing.currentPeriodStart = now;
      existing.currentPeriodEnd = periodEnd;
      existing.paypalOrderId = orderId;
      existing.amount = amount;
      existing.currency = currency;
      existing.lastPaymentAt = now;
      existing.lastPaymentAmount = amount;
      existing.cancelledAt = null;
      existing.failedPaymentAt = null;
      existing.failureReason = null;
      existing.expirySentAt = null;
      await existing.save();
    } else {
      await BossSubscription.create({
        bossUid: user.uid,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amount,
        currency,
        paypalOrderId: orderId,
        lastPaymentAt: now,
        lastPaymentAmount: amount,
      });
    }

    return createApiResponse(true, {
      orderId,
      approvalUrl,
      amount,
      currency,
      periodEnd: periodEnd.toISOString(),
    }, "PayPal subscription order created.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to create subscription.";
    console.error("Subscription Create PayPal Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
