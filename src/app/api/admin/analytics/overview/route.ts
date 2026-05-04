import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import Shift from '@/models/Shift.model';
import Payment from '@/models/Payment.model';
import Withdrawal from '@/models/Withdrawal.model';
import Dispute from '@/models/Dispute.model';
import Review from '@/models/Review.model';
import IncidentReport from '@/models/IncidentReport.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { UserRole, UserStatus, JobStatus, JobType, BidStatus, EscrowPaymentStatus, DisputeStatus, DisputeReason, AdminDecision, WithdrawalStatus, IncidentSeverity, PaymentMethod } from '@/types/enums';
import type { AdminAnalyticsOverview, AnalyticsPeriod } from '@/types/admin.types';

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  data: AdminAnalyticsOverview;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(period: string, dateFrom: string, dateTo: string): string {
  return `${period}:${dateFrom}:${dateTo}`;
}

function getCachedData(key: string): AdminAnalyticsOverview | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData(key: string, data: AdminAnalyticsOverview): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getPeriodDates(period: string, dateFrom?: string, dateTo?: string): AnalyticsPeriod {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let from: Date;
  let to: Date = new Date(today);
  to.setHours(23, 59, 59, 999);
  
  let label: string;
  
  switch (period) {
    case 'today':
      from = new Date(today);
      from.setHours(0, 0, 0, 0);
      label = 'Today';
      break;
    case 'week':
      from = new Date(today);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      label = 'This Week';
      break;
    case 'month':
      from = new Date(today);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = 'This Month';
      break;
    case 'quarter':
      from = new Date(today);
      const quarter = Math.floor(from.getMonth() / 3);
      from.setMonth(quarter * 3);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = 'This Quarter';
      break;
    case 'year':
      from = new Date(today.getFullYear(), 0, 1);
      from.setHours(0, 0, 0, 0);
      label = 'This Year';
      break;
    case 'custom':
      if (!dateFrom || !dateTo) {
        from = new Date(today);
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        label = 'Custom';
      } else {
        from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        label = 'Custom Range';
      }
      break;
    default:
      from = new Date(today);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = 'This Month';
  }
  
  return {
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
    label,
  };
}

function getPreviousPeriodDates(currentPeriod: AnalyticsPeriod): AnalyticsPeriod {
  const from = new Date(currentPeriod.dateFrom);
  const to = new Date(currentPeriod.dateTo);
  const duration = to.getTime() - from.getTime();
  
  return {
    dateFrom: new Date(from.getTime() - duration).toISOString(),
    dateTo: new Date(to.getTime() - duration).toISOString(),
    label: 'Previous Period',
  };
}

function formatPeriodDate(date: Date, period: string): string {
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  switch (period) {
    case 'today':
    case 'week':
      return `${day} ${month}`;
    case 'month':
    case 'quarter':
      return `${month} ${year}`;
    case 'year':
      return `${year}`;
    default:
      return `${day} ${month}`;
  }
}

// ─── GET /api/admin/analytics/overview ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const periodDates = getPeriodDates(period, dateFrom, dateTo);
    const previousPeriodDates = getPreviousPeriodDates(periodDates);

    // Check cache
    const cacheKey = getCacheKey(period, periodDates.dateFrom, periodDates.dateTo);
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return createApiResponse(true, cachedData, 'Analytics data fetched from cache.', 200);
    }

    await connectDB();

    // Get platform settings for currency
    const settings = await PlatformSettings.findOne().lean();
    const currency = settings?.platformCurrency || 'AUD';

    const fromDate = new Date(periodDates.dateFrom);
    const toDate = new Date(periodDates.dateTo);
    const prevFromDate = new Date(previousPeriodDates.dateFrom);
    const prevToDate = new Date(previousPeriodDates.dateTo);
    
    // Type-safe query helpers
    const dateRangeQuery = (from: Date, to: Date) => ({ $gte: from, $lte: to } as const);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ─── PLATFORM OVERVIEW ────────────────────────────────────────────────────
    const [
      totalUsers,
      totalBosses,
      totalGuards,
      newUsersThisPeriod,
      newBossesThisPeriod,
      newGuardsThisPeriod,
      activeUsers,
      pendingApprovals,
      suspendedUsers,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.BOSS }),
      User.countDocuments({ role: UserRole.MATE }),
      User.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
      User.countDocuments({ role: UserRole.BOSS, createdAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
      User.countDocuments({ role: UserRole.MATE, createdAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
      User.countDocuments({ 
        lastLoginAt: { $gte: thirtyDaysAgo },
        status: UserStatus.ACTIVE,
      } as Record<string, unknown>),
      User.countDocuments({ status: UserStatus.PENDING }),
      User.countDocuments({ status: UserStatus.SUSPENDED }),
      User.countDocuments({ status: UserStatus.BANNED }),
    ]);

    // ─── JOBS & MARKETPLACE ───────────────────────────────────────────────────
    const [
      totalJobsPosted,
      jobsPostedThisPeriod,
      totalJobsCompleted,
      jobsCompletedThisPeriod,
      totalJobsCancelled,
      totalJobsExpired,
      totalBidsSubmitted,
      bidsThisPeriod,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
      Job.countDocuments({ status: JobStatus.COMPLETED }),
      Job.countDocuments({ status: JobStatus.COMPLETED, completedAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
      Job.countDocuments({ status: JobStatus.CANCELLED }),
      Job.countDocuments({ status: JobStatus.EXPIRED }),
      Bid.countDocuments(),
      Bid.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
    ]);

    // Jobs by status
    const jobsByStatusAgg = await Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const jobsByStatus = {
      open: jobsByStatusAgg.find((s) => s._id === JobStatus.OPEN)?.count || 0,
      filled: jobsByStatusAgg.find((s) => s._id === JobStatus.FILLED)?.count || 0,
      inProgress: jobsByStatusAgg.find((s) => s._id === JobStatus.IN_PROGRESS)?.count || 0,
      completed: jobsByStatusAgg.find((s) => s._id === JobStatus.COMPLETED)?.count || 0,
      cancelled: jobsByStatusAgg.find((s) => s._id === JobStatus.CANCELLED)?.count || 0,
      expired: jobsByStatusAgg.find((s) => s._id === JobStatus.EXPIRED)?.count || 0,
    };

    // Jobs by type
    const jobsByTypeAgg = await Job.aggregate([
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
    ]);
    const jobsByType = {
      oneTime: jobsByTypeAgg.find((t) => t._id === JobType.ONE_TIME)?.count || 0,
      recurring: jobsByTypeAgg.find((t) => t._id === JobType.RECURRING)?.count || 0,
      contract: jobsByTypeAgg.find((t) => t._id === JobType.CONTRACT)?.count || 0,
    };

    // Average guards per job
    const avgGuardsAgg = await Job.aggregate([
      { $group: { _id: null, avg: { $avg: { $size: { $ifNull: ['$acceptedGuards', []] } } } } },
    ]);
    const averageGuardsPerJob = Math.round((avgGuardsAgg[0]?.avg || 0) * 100) / 100;

    // Average bids per job
    const avgBidsAgg = await Job.aggregate([
      { $group: { _id: null, avg: { $avg: '$totalBids' } } },
    ]);
    const averageBidsPerJob = Math.round((avgBidsAgg[0]?.avg || 0) * 100) / 100;

    const jobCompletionRate = totalJobsPosted > 0 
      ? Math.round((totalJobsCompleted / totalJobsPosted) * 100 * 100) / 100 
      : 0;

    // ─── REVENUE & FINANCE ────────────────────────────────────────────────────
    const [
      totalPlatformRevenueAgg,
      revenueThisPeriodAgg,
      totalBossCommissionAgg,
      totalGuardCommissionAgg,
      totalEscrowHeldAgg,
      totalPaidOutAgg,
      totalWithdrawalsAgg,
      avgJobValueAgg,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.RELEASED } },
        { $group: { _id: null, total: { $sum: '$platformRevenue' } } },
      ]),
      Payment.aggregate([
        { 
          $match: { 
            paymentStatus: EscrowPaymentStatus.RELEASED, 
            releasedAt: { $gte: fromDate, $lte: toDate } 
          } as Record<string, unknown>
        },
        { $group: { _id: null, total: { $sum: '$platformRevenue' } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.RELEASED } },
        { $group: { _id: null, total: { $sum: '$bossCommissionAmount' } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.RELEASED } },
        { $group: { _id: null, total: { $sum: '$guardCommissionAmount' } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.HELD } },
        { $group: { _id: null, total: { $sum: '$totalChargedToBoss' } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.RELEASED } },
        { $group: { _id: null, total: { $sum: '$guardPayout' } } },
      ]),
      Withdrawal.aggregate([
        { $match: { status: WithdrawalStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: EscrowPaymentStatus.RELEASED } },
        { $group: { _id: null, avg: { $avg: '$jobBudget' } } },
      ]),
    ]);

    const totalPlatformRevenue = totalPlatformRevenueAgg[0]?.total || 0;
    const revenueThisPeriod = revenueThisPeriodAgg[0]?.total || 0;
    const totalBossCommission = totalBossCommissionAgg[0]?.total || 0;
    const totalGuardCommission = totalGuardCommissionAgg[0]?.total || 0;
    const totalEscrowHeld = totalEscrowHeldAgg[0]?.total || 0;
    const totalPaidOut = totalPaidOutAgg[0]?.total || 0;
    const totalWithdrawals = totalWithdrawalsAgg[0]?.total || 0;
    const averageJobValue = Math.round((avgJobValueAgg[0]?.avg || 0) * 100) / 100;

    // Revenue by method
    const revenueByMethodAgg = await Payment.aggregate([
      { $match: { paymentStatus: EscrowPaymentStatus.RELEASED } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$platformRevenue' } } },
    ]);
    const revenueByMethod = {
      stripe: revenueByMethodAgg.find((m) => m._id === PaymentMethod.STRIPE)?.total || 0,
      paypal: revenueByMethodAgg.find((m) => m._id === PaymentMethod.PAYPAL)?.total || 0,
    };

    // Revenue by period for chart
    let revenueByPeriod: Array<{ date: string; revenue: number; transactions: number }> = [];
    
    if (period === 'today') {
      // Hourly breakdown for today
      const hourlyData = await Payment.aggregate([
        { 
          $match: { 
            paymentStatus: EscrowPaymentStatus.RELEASED, 
            releasedAt: { $gte: fromDate, $lte: toDate } 
          } as Record<string, unknown>
        },
        {
          $group: {
            _id: { $hour: '$releasedAt' },
            revenue: { $sum: '$platformRevenue' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      for (let i = 0; i < 24; i += 2) {
        const hourData = hourlyData.find((h) => h._id === i);
        revenueByPeriod.push({
          date: `${i}:00`,
          revenue: hourData?.revenue || 0,
          transactions: hourData?.transactions || 0,
        });
      }
    } else if (period === 'week') {
      // Daily breakdown for week
      const dailyData = await Payment.aggregate([
        { 
          $match: { 
            paymentStatus: EscrowPaymentStatus.RELEASED, 
            releasedAt: { $gte: fromDate, $lte: toDate } 
          } as Record<string, unknown>
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$releasedAt' } },
            revenue: { $sum: '$platformRevenue' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(fromDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = dailyData.find((d) => d._id === dateStr);
        revenueByPeriod.push({
          date: dayNames[d.getDay()],
          revenue: dayData?.revenue || 0,
          transactions: dayData?.transactions || 0,
        });
      }
    } else if (period === 'month' || period === 'quarter') {
      // Weekly breakdown
      const weeklyData = await Payment.aggregate([
        { 
          $match: { 
            paymentStatus: EscrowPaymentStatus.RELEASED, 
            releasedAt: { $gte: fromDate, $lte: toDate } 
          } as Record<string, unknown>
        },
        {
          $group: {
            _id: { $week: '$releasedAt' },
            revenue: { $sum: '$platformRevenue' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      const weeksInPeriod = period === 'month' ? 4 : 12;
      for (let i = 1; i <= weeksInPeriod; i++) {
        const weekData = weeklyData.find((w) => w._id === i);
        revenueByPeriod.push({
          date: `Week ${i}`,
          revenue: weekData?.revenue || 0,
          transactions: weekData?.transactions || 0,
        });
      }
    } else {
      // Monthly breakdown for year/custom
      const monthlyData = await Payment.aggregate([
        { 
          $match: { 
            paymentStatus: EscrowPaymentStatus.RELEASED, 
            releasedAt: { $gte: fromDate, $lte: toDate } 
          } as Record<string, unknown>
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$releasedAt' } },
            revenue: { $sum: '$platformRevenue' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyData.forEach((m) => {
        const [year, month] = m._id.split('-');
        revenueByPeriod.push({
          date: `${monthNames[parseInt(month) - 1]} ${year}`,
          revenue: m.revenue,
          transactions: m.transactions,
        });
      });
    }

    // ─── GUARD PERFORMANCE ────────────────────────────────────────────────────
    const [
      totalActiveGuards,
      avgGuardRatingAgg,
      topRatedGuardsAgg,
      avgReliabilityScoreAgg,
      guardsWithStrikes,
      totalIncidents,
      incidentsBySeverityAgg,
      shiftsCheckedInOnTime,
      shiftCompletionAgg,
    ] = await Promise.all([
      Bid.distinct('guardUid', { status: BidStatus.ACCEPTED }).then((uids) => uids.length),
      User.aggregate([
        { $match: { role: UserRole.MATE } },
        { $group: { _id: null, avg: { $avg: '$averageRating' } } },
      ]),
      User.find({ role: UserRole.MATE, totalReviews: { $gte: 3 } })
        .sort({ averageRating: -1 })
        .limit(5)
        .select('uid firstName lastName profilePhoto averageRating totalReviews totalJobsCompleted')
        .lean(),
      User.aggregate([
        { $match: { role: UserRole.MATE } },
        { $group: { _id: null, avg: { $avg: '$reliabilityScore' } } },
      ]),
      User.countDocuments({ role: UserRole.MATE, cancellationStrikes: { $gt: 0 } }),
      IncidentReport.countDocuments(),
      IncidentReport.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Shift.countDocuments({ checkInTime: { $ne: null }, checkInVerified: true }),
      Bid.aggregate([
        { $match: { status: BidStatus.ACCEPTED } },
        {
          $lookup: {
            from: 'shifts',
            let: { guardUid: '$guardUid', jobId: '$jobId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$guardUid', '$$guardUid'] },
                      { $eq: ['$jobId', '$$jobId'] },
                    ],
                  },
                },
              },
            ],
            as: 'shifts',
          },
        },
        {
          $project: {
            hasCompletedShift: { $gt: [{ $size: '$shifts' }, 0] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: ['$hasCompletedShift', 1, 0] } },
          },
        },
      ]),
    ]);

    const averageGuardRating = Math.round((avgGuardRatingAgg[0]?.avg || 0) * 100) / 100;
    const averageReliabilityScore = Math.round((avgReliabilityScoreAgg[0]?.avg || 0) * 100) / 100;
    
    const topRatedGuards = topRatedGuardsAgg.map((g) => ({
      uid: g.uid,
      name: `${g.firstName} ${g.lastName}`,
      photo: g.profilePhoto,
      rating: g.averageRating,
      totalReviews: g.totalReviews,
      totalJobsCompleted: g.totalJobsCompleted,
    }));

    const incidentsBySeverity = {
      low: incidentsBySeverityAgg.find((s) => s._id === IncidentSeverity.LOW)?.count || 0,
      medium: incidentsBySeverityAgg.find((s) => s._id === IncidentSeverity.MEDIUM)?.count || 0,
      high: incidentsBySeverityAgg.find((s) => s._id === IncidentSeverity.HIGH)?.count || 0,
      critical: incidentsBySeverityAgg.find((s) => s._id === IncidentSeverity.CRITICAL)?.count || 0,
    };

    const shiftCompletionRate = shiftCompletionAgg[0]?.total > 0
      ? Math.round((shiftCompletionAgg[0].completed / shiftCompletionAgg[0].total) * 100 * 100) / 100
      : 0;

    // ─── BOSS ACTIVITY ──────────────────────────────────────────────────────────
    const [
      totalActiveBosses,
      avgBossRatingAgg,
      topBossesAgg,
      bossesWithStrikes,
      avgJobsPerBossAgg,
    ] = await Promise.all([
      Job.distinct('postedBy').then((uids) => uids.length),
      User.aggregate([
        { $match: { role: UserRole.BOSS } },
        { $group: { _id: null, avg: { $avg: '$averageRating' } } },
      ]),
      User.find({ role: UserRole.BOSS, totalJobsPosted: { $gt: 0 } })
        .sort({ totalJobsPosted: -1, completedJobsCount: -1 })
        .limit(5)
        .select('uid firstName lastName companyName totalJobsPosted completedJobsCount cancelledJobsCount averageRating')
        .lean(),
      User.countDocuments({ role: UserRole.BOSS, cancellationStrikes: { $gt: 0 } }),
      User.aggregate([
        { $match: { role: UserRole.BOSS, totalJobsPosted: { $gt: 0 } } },
        {
          $project: {
            jobsPerMonth: {
              $divide: [
                '$totalJobsPosted',
                { $max: [{ $ceil: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 2592000000] } }, 1] },
              ],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$jobsPerMonth' } } },
      ]),
    ]);

    const averageBossRating = Math.round((avgBossRatingAgg[0]?.avg || 0) * 100) / 100;
    const averageJobPostingFrequency = Math.round((avgJobsPerBossAgg[0]?.avg || 0) * 100) / 100;

    const topBosses = topBossesAgg.map((b) => {
      const totalJobs = b.totalJobsPosted || 0;
      const completed = b.completedJobsCount || 0;
      const cancelled = b.cancelledJobsCount || 0;
      const completionRate = totalJobs > 0 
        ? Math.round((completed / totalJobs) * 100 * 100) / 100 
        : 0;
      
      return {
        uid: b.uid,
        name: `${b.firstName} ${b.lastName}`,
        company: b.companyName || `${b.firstName} ${b.lastName}`,
        totalJobsPosted: totalJobs,
        completionRate,
        averageRating: b.averageRating || 0,
      };
    });

    // ─── DISPUTES ─────────────────────────────────────────────────────────────
    const [
      totalDisputes,
      disputesThisPeriod,
      openDisputes,
      underReviewDisputes,
      resolvedDisputes,
      avgResolutionHoursAgg,
      disputesByReasonAgg,
      disputesByOutcomeAgg,
      chargebacksRaised,
    ] = await Promise.all([
      Dispute.countDocuments(),
      Dispute.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } } as Record<string, unknown>),
      Dispute.countDocuments({ status: DisputeStatus.OPEN }),
      Dispute.countDocuments({ status: DisputeStatus.UNDER_REVIEW }),
      Dispute.countDocuments({ status: DisputeStatus.RESOLVED }),
      Dispute.aggregate([
        { $match: { status: DisputeStatus.RESOLVED, resolvedAt: { $ne: null } } },
        {
          $project: {
            hours: {
              $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$hours' } } },
      ]),
      Dispute.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } },
      ]),
      Dispute.aggregate([
        { $match: { status: DisputeStatus.RESOLVED } },
        { $group: { _id: '$adminDecision', count: { $sum: 1 } } },
      ]),
      Dispute.countDocuments({ chargebackRaised: true }),
    ]);

    const averageResolutionHours = Math.round((avgResolutionHoursAgg[0]?.avg || 0) * 100) / 100;
    const disputeResolutionRate = totalDisputes > 0 
      ? Math.round((resolvedDisputes / totalDisputes) * 100 * 100) / 100 
      : 0;

    const disputesByReason = {
      noShow: disputesByReasonAgg.find((r) => r._id === DisputeReason.NO_SHOW)?.count || 0,
      partialWork: disputesByReasonAgg.find((r) => r._id === DisputeReason.PARTIAL_WORK)?.count || 0,
      misconduct: disputesByReasonAgg.find((r) => r._id === DisputeReason.MISCONDUCT)?.count || 0,
      paymentDispute: disputesByReasonAgg.find((r) => r._id === DisputeReason.PAYMENT_DISPUTE)?.count || 0,
      qualityIssue: disputesByReasonAgg.find((r) => r._id === DisputeReason.QUALITY_ISSUE)?.count || 0,
      hoursDispute: disputesByReasonAgg.find((r) => r._id === DisputeReason.HOURS_DISPUTE)?.count || 0,
      other: disputesByReasonAgg.find((r) => r._id === DisputeReason.OTHER)?.count || 0,
    };

    const disputesByOutcome = {
      release: disputesByOutcomeAgg.find((o) => o._id === AdminDecision.RELEASE)?.count || 0,
      refund: disputesByOutcomeAgg.find((o) => o._id === AdminDecision.REFUND)?.count || 0,
      partial: disputesByOutcomeAgg.find((o) => o._id === AdminDecision.PARTIAL)?.count || 0,
    };

    // ─── ASSEMBLE RESPONSE ────────────────────────────────────────────────────
    const analyticsData: AdminAnalyticsOverview = {
      period: periodDates,
      platformOverview: {
        totalUsers,
        totalBosses,
        totalGuards,
        newUsersThisPeriod,
        newBossesThisPeriod,
        newGuardsThisPeriod,
        activeUsers,
        pendingApprovals,
        suspendedUsers,
        bannedUsers,
      },
      jobsMarketplace: {
        totalJobsPosted,
        jobsPostedThisPeriod,
        totalJobsCompleted,
        jobsCompletedThisPeriod,
        totalJobsCancelled,
        totalJobsExpired,
        jobCompletionRate,
        averageGuardsPerJob,
        totalBidsSubmitted,
        averageBidsPerJob,
        jobsByStatus,
        jobsByType,
      },
      revenueFinance: {
        totalPlatformRevenue,
        revenueThisPeriod,
        totalBossCommission,
        totalGuardCommission,
        totalEscrowHeld,
        totalPaidOut,
        totalWithdrawals,
        averageJobValue,
        revenueByMethod,
        revenueByPeriod,
      },
      guardPerformance: {
        totalActiveGuards,
        averageGuardRating,
        topRatedGuards,
        averageReliabilityScore,
        guardsWithCancellationStrikes: guardsWithStrikes,
        totalIncidentsReported: totalIncidents,
        incidentsBySeverity,
        shiftsCheckedInOnTime,
        shiftCompletionRate,
      },
      bossActivity: {
        totalActiveBosses,
        averageBossRating,
        topBosses,
        bossesWithCancellationStrikes: bossesWithStrikes,
        averageJobPostingFrequency,
      },
      disputes: {
        totalDisputes,
        disputesThisPeriod,
        openDisputes,
        underReviewDisputes,
        resolvedDisputes,
        disputeResolutionRate,
        averageResolutionHours,
        disputesByReason,
        disputesByOutcome,
        chargebacksRaised,
      },
      currency,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    setCachedData(cacheKey, analyticsData);

    return createApiResponse(true, analyticsData, 'Analytics overview fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/admin/analytics/overview error:', error);
    return createApiResponse(false, null, 'Failed to fetch analytics overview.', 500);
  }
}
