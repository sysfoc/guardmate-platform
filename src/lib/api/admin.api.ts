/**
 * admin.api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend wrappers for Admin-specific operations.
 * Requires Admin role verification on the server side.
 */

import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { UserProfile } from '@/types/user.types';
import type { AdminDashboardStats, AdminActivity, AdminUserFilters, AdminActivityFilters } from '@/types/admin.types';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<ApiResponse<AdminDashboardStats>> {
  return apiGet<AdminDashboardStats>('/api/admin/stats');
}

// ─── User List (paginated, filtered, sorted) ─────────────────────────────────

export async function getUsers(params: AdminUserFilters): Promise<
  ApiResponse<{ users: UserProfile[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  return apiGet<{ users: UserProfile[]; total: number; page: number; limit: number; totalPages: number }>(
    `/api/admin/users?${query.toString()}`
  );
}

// ─── Single User Profile ──────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<ApiResponse<UserProfile>> {
  return apiGet<UserProfile>(`/api/admin/users/${uid}`);
}

// ─── Update User Status ───────────────────────────────────────────────────────

export async function updateUserStatus(
  uid: string,
  status: string,
  reason?: string
): Promise<ApiResponse<UserProfile>> {
  return apiPatch<UserProfile>(`/api/admin/users/${uid}/status`, { status, reason });
}

// ─── Promote to Admin ─────────────────────────────────────────────────────────

export async function promoteToAdmin(uid: string): Promise<ApiResponse<{ uid: string; role: string; fullName: string }>> {
  return apiPost<{ uid: string; role: string; fullName: string }>(`/api/admin/users/${uid}/promote`, {});
}

// ─── Bulk Status Update ───────────────────────────────────────────────────────

export async function bulkUpdateStatus(
  uids: string[],
  status: string,
  reason?: string
): Promise<ApiResponse<{ updated: number }>> {
  return apiPost<{ updated: number }>('/api/admin/users/bulk-status', { uids, status, reason });
}

// ─── Verification Status ──────────────────────────────────────────────────────

export async function updateVerificationStatus(
  uid: string,
  field: string,
  value: string,
  notes?: string
): Promise<ApiResponse<UserProfile>> {
  return apiPatch<UserProfile>(`/api/admin/users/${uid}/verify`, { field, value, notes });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function getAdminActivity(
  params: AdminActivityFilters = {}
): Promise<ApiResponse<{ activities: AdminActivity[]; total: number; page: number; totalPages: number }>> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  return apiGet<{ activities: AdminActivity[]; total: number; page: number; totalPages: number }>(
    `/api/admin/activity?${query.toString()}`
  );
}
