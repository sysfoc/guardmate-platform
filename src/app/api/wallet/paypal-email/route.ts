import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import GuardWallet from "@/models/GuardWallet.model";
import { UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guards can set PayPal emails.", 403);
    }

    const { email } = await request.json();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return createApiResponse(false, null, "A valid email address is required.", 400);
    }

    await connectDB();

    let wallet = await GuardWallet.findOne({ guardUid: user.uid });
    if (!wallet) {
      wallet = await GuardWallet.create({ guardUid: user.uid });
    }

    wallet.paypalEmail = email;
    wallet.paypalVerified = true; // Assuming simple trust for MVP, could require email verification
    await wallet.save();

    return createApiResponse(true, { paypalEmail: email }, "PayPal email updated successfully.", 200);

  } catch (error: any) {
    console.error("Wallet PayPal Email Error:", error);
    return createApiResponse(false, null, error.message || "Failed to update PayPal email.", 500);
  }
}
