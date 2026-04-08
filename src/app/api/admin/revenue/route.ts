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
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Only Admin accounts can view revenue dashboard.", 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const method = searchParams.get("method");
    const status = searchParams.get("status");
    
    // Default to released for revenue stats, but allow checking HELD or all
    const statusFilter = status ? { paymentStatus: status } : { paymentStatus: EscrowPaymentStatus.RELEASED };

    const skip = (page - 1) * limit;

    await connectDB();

    const matchStage: any = { ...statusFilter };
    if (method) matchStage.paymentMethod = method;
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    // ─── Stats Aggregation ────────────────────────────────────────────────
    
    const [statsResult] = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalPlatformRevenue: { $sum: "$platformRevenue" },
          bossCommissionRevenue: { $sum: "$bossCommissionAmount" },
          guardCommissionRevenue: { $sum: "$guardCommissionAmount" },
          totalJobValue: { $sum: "$jobBudget" },
        }
      }
    ]);

    // Active Escrow total
    const [escrowResult] = await Payment.aggregate([
      { $match: { paymentStatus: EscrowPaymentStatus.HELD } },
      {
        $group: {
          _id: null,
          totalActiveEscrow: { $sum: "$guardPayout" } // the money sitting waiting to be released
        }
      }
    ]);

    // This month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthStatsResult] = await Payment.aggregate([
      { $match: { ...matchStage, createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          thisMonthRevenue: { $sum: "$platformRevenue" },
        }
      }
    ]);

    // ─── Paginated List ──────────────────────────────────────────────────

    const totalCount = await Payment.countDocuments(matchStage);
    const transactions = await Payment.find(matchStage)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const summary = {
      totalPlatformRevenue: statsResult?.totalPlatformRevenue || 0,
      thisMonthRevenue: monthStatsResult?.thisMonthRevenue || 0,
      totalTransactions: statsResult?.totalTransactions || 0,
      averageTransactionValue: statsResult?.totalTransactions ? (statsResult.totalJobValue / statsResult.totalTransactions) : 0,
      totalActiveEscrow: escrowResult?.totalActiveEscrow || 0,
      bossCommissionRevenue: statsResult?.bossCommissionRevenue || 0,
      guardCommissionRevenue: statsResult?.guardCommissionRevenue || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        transactions,
      },
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      message: "Admin revenue retrieved successfully."
    });

  } catch (error: any) {
    console.error("Admin Revenue Error:", error);
    return createApiResponse(false, null, error.message || "Failed to retrieve revenue data.", 500);
  }
}
