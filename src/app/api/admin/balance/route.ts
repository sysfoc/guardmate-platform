import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import { UserRole } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/balance
// Admin only — Fetches Stripe platform account balance and recent payouts.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Only Admin accounts.", 403);
    }

    const stripe = await getStripeInstance();

    // Fetch platform balance
    const balance = await stripe.balance.retrieve();

    // Fetch recent payouts (admin withdrawals from platform to bank)
    const payouts = await stripe.payouts.list({
      limit: 20,
    });

    // Format balance data
    const available = balance.available.map((b) => ({
      amount: b.amount / 100,
      currency: b.currency.toUpperCase(),
    }));

    const pending = balance.pending.map((b) => ({
      amount: b.amount / 100,
      currency: b.currency.toUpperCase(),
    }));

    // Format payout history
    const payoutHistory = payouts.data.map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency.toUpperCase(),
      status: p.status,
      method: p.method,
      arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
      createdAt: new Date(p.created * 1000).toISOString(),
      description: p.description,
      failureMessage: p.failure_message,
    }));

    return createApiResponse(true, {
      available,
      pending,
      payoutHistory,
    }, "Platform balance retrieved successfully.", 200);

  } catch (error: any) {
    console.error("Admin Balance Error:", error);
    return createApiResponse(false, null, error.message || "Failed to fetch platform balance.", 500);
  }
}
