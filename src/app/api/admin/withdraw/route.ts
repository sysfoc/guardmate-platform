import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import PlatformSettings from "@/models/PlatformSettings.model";
import { UserRole } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/withdraw
// Admin only — Creates a Stripe Payout from the platform account to the
// platform's linked bank account.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Only Admin accounts can withdraw platform funds.", 403);
    }

    const { amount, description } = await request.json();

    if (!amount || amount <= 0) {
      return createApiResponse(false, null, "Valid withdrawal amount is required.", 400);
    }

    await connectDB();
    const settings = await PlatformSettings.findOne().lean();
    const currency = (settings?.platformCurrency || 'AUD').toLowerCase();

    const stripe = await getStripeInstance();

    // Check available balance first
    const balance = await stripe.balance.retrieve();
    const availableForCurrency = balance.available.find(
      (b) => b.currency === currency
    );

    const availableAmount = availableForCurrency ? availableForCurrency.amount / 100 : 0;

    if (amount > availableAmount) {
      return createApiResponse(
        false,
        null,
        `Insufficient available balance. You have ${currency.toUpperCase()} ${availableAmount.toFixed(2)} available.`,
        400
      );
    }

    // Create the payout (Stripe sends money from platform account to platform's bank)
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      description: description || `GuardMate Platform Withdrawal by ${user.firstName} ${user.lastName}`,
      metadata: {
        adminUid: user.uid,
        adminName: `${user.firstName} ${user.lastName}`,
        initiatedAt: new Date().toISOString(),
      },
    });

    return createApiResponse(true, {
      payoutId: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
      method: payout.method,
    }, "Withdrawal initiated successfully. Funds will arrive in your bank account shortly.", 200);

  } catch (error: any) {
    console.error("Admin Withdraw Error:", error);

    // Provide friendly error messages for common Stripe payout errors
    let message = error.message || "Failed to process withdrawal.";
    if (error.code === 'balance_insufficient') {
      message = "Insufficient available balance in Stripe account.";
    } else if (error.code === 'payout_not_allowed') {
      message = "Payouts are not enabled for this Stripe account. Please add a bank account in Stripe Dashboard first.";
    }

    return createApiResponse(false, null, message, 500);
  }
}
