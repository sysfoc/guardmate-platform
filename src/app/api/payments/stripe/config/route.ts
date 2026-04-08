import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import PlatformSettings from "@/models/PlatformSettings.model";
import { UserRole } from "@/types/enums";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can access payment config.", 403);
    }

    await connectDB();

    const settings = await PlatformSettings.findOne().lean();
    
    if (!settings?.stripeEnabled || !settings?.stripePublishableKey) {
      return createApiResponse(false, null, "Stripe is not configured.", 400);
    }

    return createApiResponse(true, {
      publishableKey: settings.stripePublishableKey,
      currency: settings.platformCurrency || "AUD",
    }, "Stripe config retrieved.", 200);

  } catch (error: any) {
    console.error("Stripe Config Error:", error);
    return createApiResponse(false, null, error.message || "Failed to retrieve Stripe config.", 500);
  }
}
