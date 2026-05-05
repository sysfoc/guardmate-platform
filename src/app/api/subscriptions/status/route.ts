import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import PlatformSettings from "@/models/PlatformSettings.model";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import type { ISubscriptionStatus } from "@/types/subscription.types";

/**
 * GET /api/subscriptions/status
 * Boss only — returns current subscription status with computed fields.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can check subscription status.", 403);
    }

    await connectDB();

    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.bossSubscriptionEnabled) {
      // Subscription not required — Boss is "subscribed" by default
      const result: ISubscriptionStatus = {
        isSubscribed: true,
        status: 'NOT_REQUIRED',
        expiresAt: null,
        daysRemaining: null,
        amount: 0,
        currency: settings?.platformCurrency || 'AUD',
      };
      return createApiResponse(true, result, "Subscription not required.", 200);
    }

    const subscription = await BossSubscription.findOne({ bossUid: user.uid });
    const now = new Date();
    const amount = settings.bossSubscriptionAmount ?? 0;
    const currency = settings.bossSubscriptionCurrency || settings.platformCurrency || 'AUD';

    // No subscription
    if (!subscription) {

      const result: ISubscriptionStatus = {
        isSubscribed: false,
        status: 'NONE',
        expiresAt: null,
        daysRemaining: null,
        amount,
        currency,
      };
      return createApiResponse(true, result, "No subscription.", 200);
    }

    // Active subscription
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      const endDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
      const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : null;

      const result: ISubscriptionStatus = {
        isSubscribed: true,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: endDate?.toISOString() || null,
        daysRemaining,
        amount: subscription.amount || amount,
        currency: subscription.currency || currency,
      };
      return createApiResponse(true, result, "Subscription active.", 200);
    }

    // Cancelled — still active until period end
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      const endDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
      const isStillActive = endDate ? now < endDate : false;
      const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : null;

      const result: ISubscriptionStatus = {
        isSubscribed: isStillActive,
        status: SubscriptionStatus.CANCELLED,
        expiresAt: endDate?.toISOString() || null,
        daysRemaining: isStillActive ? daysRemaining : 0,
        amount: subscription.amount || amount,
        currency: subscription.currency || currency,
      };
      return createApiResponse(true, result, isStillActive ? "Cancelled but active until period end." : "Subscription cancelled.", 200);
    }

    // Lapsed
    if (subscription.status === SubscriptionStatus.LAPSED) {
      const result: ISubscriptionStatus = {
        isSubscribed: false,
        status: SubscriptionStatus.LAPSED,
        expiresAt: null,
        daysRemaining: 0,
        amount: subscription.amount || amount,
        currency: subscription.currency || currency,
      };
      return createApiResponse(true, result, "Subscription lapsed.", 200);
    }

    // Fallback
    const result: ISubscriptionStatus = {
      isSubscribed: false,
      status: subscription.status,
      expiresAt: null,
      daysRemaining: null,
      amount,
      currency,
    };
    return createApiResponse(true, result, "Subscription status.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch subscription status.";
    console.error("Subscription Status Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
