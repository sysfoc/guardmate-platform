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
