import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import { UserRole, EscrowPaymentStatus } from "@/types/enums";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guards have earnings.", 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    await connectDB();

    const query = {
      guardUid: user.uid,
      paymentStatus: EscrowPaymentStatus.RELEASED
    };

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ releasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      message: "Earnings retrieved successfully."
    });

  } catch (error: any) {
    console.error("Wallet Earnings Error:", error);
    return createApiResponse(false, null, error.message || "Failed to retrieve earnings.", 500);
  }
}
