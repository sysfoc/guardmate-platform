import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import GuardWallet from "@/models/GuardWallet.model";
import { UserRole } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guards have Stripe Connect access.", 403);
    }

    await connectDB();
    const stripe = await getStripeInstance();

    const wallet = await GuardWallet.findOne({ guardUid: user.uid });
    if (!wallet || !wallet.stripeAccountId) {
      return createApiResponse(true, { verified: false, accountId: null }, "Stripe account not created.", 200);
    }

    // Retrieve account status from Stripe
    const account = await stripe.accounts.retrieve(wallet.stripeAccountId);
    
    // An account is verified if transfers capability is active and details are submitted
    const isVerified = account.details_submitted && account.capabilities?.transfers === 'active';

    // Update wallet if status changed
    if (wallet.stripeAccountVerified !== isVerified) {
      wallet.stripeAccountVerified = isVerified;
      await wallet.save();
    }

    return createApiResponse(
      true, 
      { 
        verified: isVerified,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      }, 
      "Stripe Connect status retrieved.", 
      200
    );

  } catch (error: any) {
    console.error("Stripe Status Error:", error);
    return createApiResponse(false, null, error.message || "Failed to retrieve Stripe status.", 500);
  }
}
