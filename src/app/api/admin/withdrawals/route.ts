import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Withdrawal from "@/models/Withdrawal.model";
import GuardWallet from "@/models/GuardWallet.model";
import User from "@/models/User.model";
import { UserRole } from "@/types/enums";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/withdrawals
// Admin only — Fetches a paginated list of all withdrawals with Guard details.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Only Admin accounts.", 403);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const method = searchParams.get('method');

    await connectDB();

    const query: any = {};
    if (status) query.status = status;
    if (method) query.withdrawalMethod = method;

    const skip = (page - 1) * limit;

    const withdrawals = await Withdrawal.find(query)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Withdrawal.countDocuments(query);

    // Fetch guard details and wallet details for each withdrawal
    const enrichedWithdrawals = await Promise.all(withdrawals.map(async (w) => {
      const guard = await User.findOne({ uid: w.guardUid }).select('firstName lastName email profilePhoto').lean();
      const wallet = await GuardWallet.findOne({ guardUid: w.guardUid }).select('bankAccountName bankBSB bankAccountNumber').lean();

      let walletDetailsToReturn = wallet ? { ...wallet } : null;
      if (walletDetailsToReturn && walletDetailsToReturn.bankAccountNumber) {
        walletDetailsToReturn.bankAccountNumber = `***${walletDetailsToReturn.bankAccountNumber.slice(-3)}`;
      }

      return {
        ...w,
        guard: guard || null,
        walletDetails: walletDetailsToReturn,
      };
    }));

    return NextResponse.json({
      success: true,
      data: enrichedWithdrawals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error("Admin Withdrawals GET Error:", error);
    return createApiResponse(false, null, error.message || "Failed to fetch withdrawals.", 500);
  }
}
