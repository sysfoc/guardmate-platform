import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import BossSubscription from "@/models/BossSubscription.model";
import User from "@/models/User.model";
import { UserRole } from "@/types/enums";

/**
 * GET /api/admin/subscriptions
 * Admin only — paginated list of all Boss subscriptions.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Admin only.", 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const status = url.searchParams.get("status");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      query.createdAt = dateFilter;
    }

    const [subscriptions, total] = await Promise.all([
      BossSubscription.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BossSubscription.countDocuments(query),
    ]);

    // Fetch Boss info for each subscription
    const bossUids = subscriptions.map((s) => s.bossUid);
    const bosses = await User.find({ uid: { $in: bossUids } })
      .select("uid firstName lastName companyName email")
      .lean();
    const bossMap = new Map(bosses.map((b) => [b.uid, b]));

    const enriched = subscriptions.map((sub) => {
      const boss = bossMap.get(sub.bossUid);
      return {
        ...sub,
        bossName: boss ? `${boss.firstName} ${boss.lastName}` : "Unknown",
        companyName: boss?.companyName || "N/A",
        bossEmail: boss?.email || "",
      };
    });

    // Calculate stats
    const allSubs = await BossSubscription.find().lean();
    const stats = {
      total: allSubs.length,
      active: allSubs.filter((s) => s.status === "ACTIVE").length,
      lapsed: allSubs.filter((s) => s.status === "LAPSED").length,
      cancelled: allSubs.filter((s) => s.status === "CANCELLED").length,
      trial: allSubs.filter((s) => s.status === "TRIAL").length,
      monthlyRecurringRevenue: allSubs
        .filter((s) => s.status === "ACTIVE")
        .reduce((sum, s) => sum + (s.amount || 0), 0),
    };

    return createApiResponse(true, {
      data: enriched,
      stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, "Subscriptions fetched.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch subscriptions.";
    console.error("Admin Subscriptions Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
