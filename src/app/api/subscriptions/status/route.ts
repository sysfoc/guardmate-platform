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
        isInGracePeriod: false,
        amount: 0,
        currency: settings?.platformCurrency || 'AUD',
      };
      return createApiResponse(true, result, "Subscription not required.", 200);
    }

    const subscription = await BossSubscription.findOne({ bossUid: user.uid });
    const now = new Date();
    const gracePeriodDays = settings.bossSubscriptionGracePeriodDays ?? 3;
    const trialDays = settings.bossSubscriptionTrialDays ?? 0;
    const amount = settings.bossSubscriptionAmount ?? 0;
    const currency = settings.bossSubscriptionCurrency || settings.platformCurrency || 'AUD';

    // No subscription record — check trial eligibility
    if (!subscription) {
      if (trialDays > 0 && user.createdAt) {
        const registeredAt = new Date(user.createdAt as string);
        const trialEnd = new Date(registeredAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
        if (now < trialEnd) {
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          const result: ISubscriptionStatus = {
            isSubscribed: true,
            status: SubscriptionStatus.TRIAL,
            expiresAt: trialEnd.toISOString(),
            daysRemaining,
            isInGracePeriod: false,
            amount,
            currency,
          };
          return createApiResponse(true, result, "In trial period.", 200);
        }
      }

      // No subscription, no trial
      const result: ISubscriptionStatus = {
        isSubscribed: false,
        status: 'NONE',
        expiresAt: null,
        daysRemaining: null,
        isInGracePeriod: false,
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
        isInGracePeriod: false,
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
        isInGracePeriod: false,
        amount: subscription.amount || amount,
        currency: subscription.currency || currency,
      };
      return createApiResponse(true, result, isStillActive ? "Cancelled but active until period end." : "Subscription cancelled.", 200);
    }

    // Lapsed — check grace period
    if (subscription.status === SubscriptionStatus.LAPSED) {
      const endDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
      const graceEnd = endDate ? new Date(endDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000) : null;
      const isInGracePeriod = graceEnd ? now < graceEnd : false;
      const daysUntilGraceEnd = graceEnd ? Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;

      const result: ISubscriptionStatus = {
        isSubscribed: isInGracePeriod,
        status: SubscriptionStatus.LAPSED,
        expiresAt: graceEnd?.toISOString() || null,
        daysRemaining: isInGracePeriod ? daysUntilGraceEnd : 0,
        isInGracePeriod,
        amount: subscription.amount || amount,
        currency: subscription.currency || currency,
      };
      return createApiResponse(true, result, isInGracePeriod ? "In grace period." : "Subscription lapsed.", 200);
    }

    // Trial status from subscription record
    if (subscription.status === SubscriptionStatus.TRIAL) {
      const trialEnd = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
      const isInTrial = trialEnd ? now < trialEnd : false;
      const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;

      const result: ISubscriptionStatus = {
        isSubscribed: isInTrial,
        status: SubscriptionStatus.TRIAL,
        expiresAt: trialEnd?.toISOString() || null,
        daysRemaining,
        isInGracePeriod: false,
        amount,
        currency,
      };
      return createApiResponse(true, result, isInTrial ? "In trial." : "Trial ended.", 200);
    }

    // Fallback
    const result: ISubscriptionStatus = {
      isSubscribed: false,
      status: subscription.status,
      expiresAt: null,
      daysRemaining: null,
      isInGracePeriod: false,
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
