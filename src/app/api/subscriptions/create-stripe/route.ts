import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import PlatformSettings from "@/models/PlatformSettings.model";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

/**
 * POST /api/subscriptions/create-stripe
 * Boss only — create a PaymentIntent for the monthly subscription amount.
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

    // Check if already active
    const existing = await BossSubscription.findOne({ bossUid: user.uid });
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      return createApiResponse(false, null, "You already have an active subscription.", 400);
    }

    // Get subscription config
    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.bossSubscriptionEnabled) {
      return createApiResponse(false, null, "Subscription is not required at this time.", 400);
    }
    if (!settings.stripeEnabled) {
      return createApiResponse(false, null, "Stripe payments are not enabled.", 400);
    }

    const amount = settings.bossSubscriptionAmount;
    if (!amount || amount <= 0) {
      return createApiResponse(false, null, "Subscription amount not configured.", 400);
    }

    const currency = (settings.bossSubscriptionCurrency || settings.platformCurrency || "AUD").toLowerCase();

    const stripe = await getStripeInstance();

    // Create or retrieve Stripe Customer
    let stripeCustomerId = existing?.stripeCustomerId || null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { bossUid: user.uid },
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      });
      stripeCustomerId = customer.id;
    }

    // Create PaymentIntent
    const amountInCents = Math.round(amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      customer: stripeCustomerId,
      metadata: {
        type: "boss_subscription",
        bossUid: user.uid,
      },
    });

    // Create or update subscription record
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existing) {
      existing.status = SubscriptionStatus.ACTIVE;
      existing.currentPeriodStart = now;
      existing.currentPeriodEnd = periodEnd;
      existing.stripeCustomerId = stripeCustomerId;
      existing.stripeSubscriptionId = paymentIntent.id;
      existing.amount = amount;
      existing.currency = currency.toUpperCase();
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
        currency: currency.toUpperCase(),
        stripeCustomerId,
        stripeSubscriptionId: paymentIntent.id,
        lastPaymentAt: now,
        lastPaymentAmount: amount,
      });
    }

    return createApiResponse(true, {
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: currency.toUpperCase(),
      periodEnd: periodEnd.toISOString(),
    }, "Subscription PaymentIntent created.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to create subscription.";
    console.error("Subscription Create Stripe Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
