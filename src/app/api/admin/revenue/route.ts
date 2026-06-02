import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import BoostPayment from "@/models/BoostPayment.model";
import BossSubscription from "@/models/BossSubscription.model";
import { UserRole, EscrowPaymentStatus, SubscriptionStatus } from "@/types/enums";

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
    const category = searchParams.get("category") || "all"; // 'all' | 'escrow' | 'subscription' | 'boost'

    const skip = (page - 1) * limit;

    // Date filter helper
    const buildDateFilter = (baseFilter: any) => {
      const filter = { ...baseFilter };
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filter.createdAt.$lte = new Date(dateTo);
      }
      return filter;
    };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    await connectDB();

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ESCROW PAYMENTS (Job payments)
    // ═══════════════════════════════════════════════════════════════════════
    const escrowStatusFilter = status ? { paymentStatus: status } : { paymentStatus: EscrowPaymentStatus.RELEASED };
    const escrowMatch = buildDateFilter({ ...escrowStatusFilter });
    if (method) escrowMatch.paymentMethod = method;

    const [escrowStats, escrowMonthStats, escrowActive] = await Promise.all([
      Payment.aggregate([
        { $match: escrowMatch },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            platformRevenue: { $sum: "$platformRevenue" },
            bossCommission: { $sum: "$bossCommissionAmount" },
            guardCommission: { $sum: "$guardCommissionAmount" },
            jobValue: { $sum: "$jobBudget" },
          }
        }
      ]),
      Payment.aggregate([
        { $match: { ...escrowStatusFilter, ...(method ? { paymentMethod: method } : {}), createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, revenue: { $sum: "$platformRevenue" } } }
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.HELD } },
        { $group: { _id: null, total: { $sum: "$guardPayout" } } }
      ]),
    ]);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. SUBSCRIPTION PAYMENTS (Boss monthly subs)
    // ═══════════════════════════════════════════════════════════════════════
    // Note: BossSubscription stores only the latest payment per subscription.
    // For historical tracking, a dedicated transaction log is recommended.
    const subDateFilter: any = {};
    if (dateFrom) subDateFilter.lastPaymentAt = { ...subDateFilter.lastPaymentAt, $gte: new Date(dateFrom) };
    if (dateTo) subDateFilter.lastPaymentAt = { ...subDateFilter.lastPaymentAt, $lte: new Date(dateTo) };

    const subBaseMatch = { status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED] }, lastPaymentAt: { $ne: null } };
    const [subStats, subMonthStats] = await Promise.all([
      BossSubscription.aggregate([
        { $match: { ...subBaseMatch, ...subDateFilter } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: "$lastPaymentAmount" },
          }
        }
      ]),
      BossSubscription.aggregate([
        { $match: { ...subBaseMatch, lastPaymentAt: { $gte: startOfMonth } } },
        { $group: { _id: null, revenue: { $sum: "$lastPaymentAmount" } } }
      ]),
    ]);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. BOOST PAYMENTS (Guard profile boosts)
    // ═══════════════════════════════════════════════════════════════════════
    const boostDateFilter: any = { status: 'COMPLETED' };
    if (dateFrom) boostDateFilter.createdAt = { ...boostDateFilter.createdAt, $gte: new Date(dateFrom) };
    if (dateTo) boostDateFilter.createdAt = { ...boostDateFilter.createdAt, $lte: new Date(dateTo) };

    const boostBaseMatch = { status: 'COMPLETED' };
    const [boostStats, boostMonthStats] = await Promise.all([
      BoostPayment.aggregate([
        { $match: { ...boostBaseMatch, ...boostDateFilter } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          }
        }
      ]),
      BoostPayment.aggregate([
        { $match: { ...boostBaseMatch, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, revenue: { $sum: "$amount" } } }
      ]),
    ]);

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    const escrowRevenue = escrowStats[0]?.platformRevenue || 0;
    const subscriptionRevenue = subStats[0]?.revenue || 0;
    const boostRevenue = boostStats[0]?.revenue || 0;

    const escrowMonthRevenue = escrowMonthStats[0]?.revenue || 0;
    const subMonthRevenue = subMonthStats[0]?.revenue || 0;
    const boostMonthRevenue = boostMonthStats[0]?.revenue || 0;

    const summary = {
      totalPlatformRevenue: escrowRevenue + subscriptionRevenue + boostRevenue,
      escrowRevenue,
      subscriptionRevenue,
      boostRevenue,
      thisMonthRevenue: escrowMonthRevenue + subMonthRevenue + boostMonthRevenue,
      escrowMonthRevenue,
      subMonthRevenue,
      boostMonthRevenue,
      totalTransactions: (escrowStats[0]?.count || 0) + (subStats[0]?.count || 0) + (boostStats[0]?.count || 0),
      escrowTransactions: escrowStats[0]?.count || 0,
      subTransactions: subStats[0]?.count || 0,
      boostTransactions: boostStats[0]?.count || 0,
      totalActiveEscrow: escrowActive[0]?.total || 0,
      bossCommissionRevenue: escrowStats[0]?.bossCommission || 0,
      guardCommissionRevenue: escrowStats[0]?.guardCommission || 0,
      averageTransactionValue: escrowStats[0]?.count ? (escrowStats[0].jobValue / escrowStats[0].count) : 0,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PAGINATED TRANSACTION LIST (by category)
    // ═══════════════════════════════════════════════════════════════════════
    let transactions: any[] = [];
    let totalCount = 0;

    if (category === 'escrow' || category === 'all') {
      const escrowTxs = await Payment.find(escrowMatch)
        .sort({ createdAt: -1 })
        .skip(category === 'all' ? 0 : skip)
        .limit(category === 'all' ? 5 : limit)
        .lean();
      transactions = transactions.concat(escrowTxs.map((tx: any) => ({ ...tx, category: 'ESCROW' })));
      totalCount += await Payment.countDocuments(escrowMatch);
    }

    if (category === 'subscription' || category === 'all') {
      const subQuery = { status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED] }, lastPaymentAt: { $ne: null }, ...subDateFilter };
      const subTxs = await BossSubscription.find(subQuery)
        .sort({ lastPaymentAt: -1 })
        .skip(category === 'all' ? 0 : skip)
        .limit(category === 'all' ? 5 : limit)
        .lean();
      transactions = transactions.concat(subTxs.map((tx: any) => ({
        _id: tx._id,
        category: 'SUBSCRIPTION',
        bossUid: tx.bossUid,
        amount: tx.lastPaymentAmount,
        currency: tx.currency,
        planTier: tx.planTier,
        status: tx.status,
        createdAt: tx.lastPaymentAt,
      })));
      totalCount += await BossSubscription.countDocuments(subQuery);
    }

    if (category === 'boost' || category === 'all') {
      const boostQuery = { status: 'COMPLETED', ...boostDateFilter };
      const boostTxs = await BoostPayment.find(boostQuery)
        .sort({ createdAt: -1 })
        .skip(category === 'all' ? 0 : skip)
        .limit(category === 'all' ? 5 : limit)
        .lean();
      transactions = transactions.concat(boostTxs.map((tx: any) => ({
        _id: tx._id,
        category: 'BOOST',
        guardUid: tx.guardUid,
        amount: tx.amount,
        currency: tx.currency,
        durationDays: tx.durationDays,
        status: tx.status,
        createdAt: tx.createdAt,
      })));
      totalCount += await BoostPayment.countDocuments(boostQuery);
    }

    // Sort combined transactions by date desc when viewing 'all'
    if (category === 'all') {
      transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        transactions,
        categoryBreakdown: {
          escrow: { revenue: escrowRevenue, count: escrowStats[0]?.count || 0 },
          subscription: { revenue: subscriptionRevenue, count: subStats[0]?.count || 0 },
          boost: { revenue: boostRevenue, count: boostStats[0]?.count || 0 },
        },
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
