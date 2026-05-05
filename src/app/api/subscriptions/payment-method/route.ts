import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, SubscriptionStatus } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscriptions/payment-method
// Returns the Boss's saved payment method details from Stripe.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts.", 403);
    }

    await connectDB();

    const sub = await BossSubscription.findOne({ bossUid: user.uid }).lean();
    if (!sub?.stripeCustomerId) {
      return createApiResponse(true, { hasPaymentMethod: false }, "No payment method on file.", 200);
    }

    const stripe = await getStripeInstance();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: sub.stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return createApiResponse(true, { hasPaymentMethod: false }, "No payment method on file.", 200);
    }

    const pm = paymentMethods.data[0];
    return createApiResponse(true, {
      hasPaymentMethod: true,
      paymentMethodId: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }, "Payment method retrieved.", 200);
  } catch (error: any) {
    console.error("Payment Method GET Error:", error);
    return createApiResponse(false, null, error.message || "Failed to fetch payment method.", 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/payment-method
// Update the Boss's default payment method in Stripe.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts.", 403);
    }

    const { paymentMethodId } = await request.json();
    if (!paymentMethodId) {
      return createApiResponse(false, null, "paymentMethodId is required.", 400);
    }

    await connectDB();

    const sub = await BossSubscription.findOne({ bossUid: user.uid });
    if (!sub?.stripeCustomerId) {
      return createApiResponse(false, null, "No Stripe customer found. Subscribe first.", 400);
    }

    const stripe = await getStripeInstance();

    // Attach the new payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: sub.stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(sub.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Also update subscription default if active
    if (sub.stripeSubscriptionId && sub.status !== SubscriptionStatus.CANCELLED) {
      try {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          default_payment_method: paymentMethodId,
        });
      } catch (e) {
        console.warn('Could not update subscription payment method:', e);
      }
    }

    // Return new card details
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    return createApiResponse(true, {
      hasPaymentMethod: true,
      paymentMethodId: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }, "Payment method updated successfully.", 200);
  } catch (error: any) {
    console.error("Payment Method POST Error:", error);
    return createApiResponse(false, null, error.message || "Failed to update payment method.", 500);
  }
}
