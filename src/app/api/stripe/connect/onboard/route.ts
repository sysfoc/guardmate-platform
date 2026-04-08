import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import GuardWallet from "@/models/GuardWallet.model";
import { UserRole } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guards can onboard to Stripe.", 403);
    }

    // Default to AU if no country is specified in the request
    let country = "AU";
    try {
      const body = await request.json();
      if (body.country && ['AU', 'GB'].includes(body.country)) {
        country = body.country;
      }
    } catch {
      // Ignored
    }

    await connectDB();
    const stripe = await getStripeInstance();

    let wallet = await GuardWallet.findOne({ guardUid: user.uid });
    
    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await GuardWallet.create({ guardUid: user.uid });
    }

    let accountId = wallet.stripeAccountId;

    // 1. Create a custom connected account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: country,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        business_profile: {
          product_description: "Security Guard Services on GuardMate",
        },
      });
      accountId = account.id;
      
      wallet.stripeAccountId = accountId;
      await wallet.save();
    }

    // 2. Generate Account Link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/dashboard/mate/wallet?stripe=refresh`,
      return_url: `${appUrl}/dashboard/mate/wallet?stripe=success`,
      type: "account_onboarding",
    });

    return createApiResponse(true, { url: accountLink.url }, "Stripe Connect onboarding link generated.", 200);

  } catch (error: any) {
    console.error("Stripe Onboarding Error:", error);
    return createApiResponse(false, null, error.message || "Failed to start Stripe onboarding.", 500);
  }
}
