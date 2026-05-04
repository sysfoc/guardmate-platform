import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";

/**
 * POST /api/subscriptions/cancel
 * Boss only — cancel subscription (remains active until currentPeriodEnd).
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

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    await subscription.save();

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
