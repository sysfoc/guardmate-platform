// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Admin Types
// ─────────────────────────────────────────────────────────────────────────────

import type { UserStatus } from './enums';

// ─── Admin Action Types ───────────────────────────────────────────────────────

export enum AdminActionType {
  USER_APPROVE = 'USER_APPROVE',
  USER_REJECT = 'USER_REJECT',
  USER_SUSPEND = 'USER_SUSPEND',
  USER_BAN = 'USER_BAN',
  USER_RESTORE = 'USER_RESTORE',
  USER_PROMOTE = 'USER_PROMOTE',
  USER_DEMOTE = 'USER_DEMOTE',
  USER_UPDATE = 'USER_UPDATE',
  USER_VIEW = 'USER_VIEW',
  VERIFY_LICENSE = 'VERIFY_LICENSE',
  VERIFY_FIRST_AID = 'VERIFY_FIRST_AID',
  VERIFY_WHITE_CARD = 'VERIFY_WHITE_CARD',
  VERIFY_CHILDREN_CHECK = 'VERIFY_CHILDREN_CHECK',
  VERIFY_VICTORIAN_LICENCE = 'VERIFY_VICTORIAN_LICENCE',
  SYSTEM_SETTING_UPDATE = 'SYSTEM_SETTING_UPDATE',
  CONTENT_DELETE = 'CONTENT_DELETE',
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  PAYMENT_ADJUST = 'PAYMENT_ADJUST',
}

// ─── Admin Activity Log Entry ─────────────────────────────────────────────────

export interface AdminActivity {
  _id: string;
  adminUid: string;
  adminName: string;
  actionType: AdminActionType;
  targetType: 'USER' | 'JOB' | 'PAYMENT' | 'SETTING' | 'SYSTEM';
  targetId: string | null;
  targetName: string | null;
  targetRole: string | null;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ─── Legacy AdminStats (kept for backward compat) ─────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalMates: number;
  totalBosses: number;
  pendingGuardApprovals: number;
  pendingBossApprovals: number;
  activeJobs: number;
  totalEarnings: number;
  monthlyGrowth: number;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalGuards: number;
  totalBosses: number;
  pendingApprovals: number;
  activeUsers: number;
  suspendedUsers: number;
  totalRevenue: number;
  totalJobsPosted: number;
  activeJobs: number;
  recentPending: AdminPendingUser[];
  recentActivity: AdminActivity[];
}

export interface AdminPendingUser {
  _id: string;
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  profilePhoto: string | null;
  createdAt: string;
}

// ─── User Filters ─────────────────────────────────────────────────────────────

export interface AdminUserFilters {
  role?: string;
  status?: string;
  search?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Activity Filters ─────────────────────────────────────────────────────────

export interface AdminActivityFilters {
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Bulk Action ──────────────────────────────────────────────────────────────

export interface BulkActionPayload {
  uids: string[];
  status: UserStatus;
  reason?: string;
}

export interface AdminJobFilters {
  status?: string;
  bossUid?: string;
  locationCity?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Analytics Types ────────────────────────────────────────────────────────

export interface AnalyticsPeriod {
  dateFrom: string;
  dateTo: string;
  label: string;
}

export interface PlatformOverviewStats {
  totalUsers: number;
  totalBosses: number;
  totalGuards: number;
  newUsersThisPeriod: number;
  newBossesThisPeriod: number;
  newGuardsThisPeriod: number;
  activeUsers: number;
  pendingApprovals: number;
  suspendedUsers: number;
  bannedUsers: number;
}

export interface JobsMarketplaceStats {
  totalJobsPosted: number;
  jobsPostedThisPeriod: number;
  totalJobsCompleted: number;
  jobsCompletedThisPeriod: number;
  totalJobsCancelled: number;
  totalJobsExpired: number;
  jobCompletionRate: number;
  averageGuardsPerJob: number;
  totalBidsSubmitted: number;
  averageBidsPerJob: number;
  jobsByStatus: {
    open: number;
    filled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    expired: number;
  };
  jobsByType: {
    oneTime: number;
    recurring: number;
    contract: number;
  };
}

export interface RevenueByPeriodItem {
  date: string;
  revenue: number;
  transactions: number;
}

export interface RevenueFinanceStats {
  totalPlatformRevenue: number;
  revenueThisPeriod: number;
  totalBossCommission: number;
  totalGuardCommission: number;
  totalEscrowHeld: number;
  totalPaidOut: number;
  totalWithdrawals: number;
  averageJobValue: number;
  revenueByMethod: {
    stripe: number;
    paypal: number;
  };
  revenueByPeriod: RevenueByPeriodItem[];
}

export interface TopRatedGuard {
  uid: string;
  name: string;
  photo: string | null;
  rating: number;
  totalReviews: number;
  totalJobsCompleted: number;
}

export interface GuardPerformanceStats {
  totalActiveGuards: number;
  averageGuardRating: number;
  topRatedGuards: TopRatedGuard[];
  averageReliabilityScore: number;
  guardsWithCancellationStrikes: number;
  totalIncidentsReported: number;
  incidentsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  shiftsCheckedInOnTime: number;
  shiftCompletionRate: number;
}

export interface TopBoss {
  uid: string;
  name: string;
  company: string;
  totalJobsPosted: number;
  completionRate: number;
  averageRating: number;
}

export interface BossActivityStats {
  totalActiveBosses: number;
  averageBossRating: number;
  topBosses: TopBoss[];
  bossesWithCancellationStrikes: number;
  averageJobPostingFrequency: number;
}

export interface DisputeStats {
  totalDisputes: number;
  disputesThisPeriod: number;
  openDisputes: number;
  underReviewDisputes: number;
  resolvedDisputes: number;
  disputeResolutionRate: number;
  averageResolutionHours: number;
  disputesByReason: {
    noShow: number;
    partialWork: number;
    misconduct: number;
    paymentDispute: number;
    qualityIssue: number;
    hoursDispute: number;
    other: number;
  };
  disputesByOutcome: {
    release: number;
    refund: number;
    partial: number;
  };
  chargebacksRaised: number;
}

export interface AdminAnalyticsOverview {
  period: AnalyticsPeriod;
  platformOverview: PlatformOverviewStats;
  jobsMarketplace: JobsMarketplaceStats;
  revenueFinance: RevenueFinanceStats;
  guardPerformance: GuardPerformanceStats;
  bossActivity: BossActivityStats;
  disputes: DisputeStats;
  currency: string;
  generatedAt: string;
}

export interface AnalyticsFilters {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  dateFrom?: string;
  dateTo?: string;
}
