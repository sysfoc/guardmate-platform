/**
 * admin.api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend wrappers for Admin-specific operations.
 * Requires Admin role verification on the server side.
 */

import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { UserProfile } from '@/types/user.types';
import type { AdminDashboardStats, AdminActivity, AdminUserFilters, AdminActivityFilters, AdminJobFilters } from '@/types/admin.types';
import type { IJob } from '@/types/job.types';
import type { IIncidentReport } from '@/types/shift.types';

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

// ─── Certificate Status ───────────────────────────────────────────────────────

const CERTIFICATE_FIELD_MAP: Record<string, string> = {
  FIRST_AID: 'firstAidCertificateStatus',
  WHITE_CARD: 'constructionWhiteCardStatus',
  CHILDREN_CHECK: 'workingWithChildrenCheckStatus',
  LICENSE: 'licenseStatus',
  ID: 'idVerificationStatus',
  VICTORIAN_LICENCE: 'victorianBusinessLicenceStatus',
};

export async function updateCertificateStatus(
  uid: string,
  certificateType: string,
  status: string,
  notes?: string
): Promise<ApiResponse<UserProfile>> {
  const field = CERTIFICATE_FIELD_MAP[certificateType];
  if (!field) throw new Error(`Unknown certificate type: ${certificateType}`);
  return updateVerificationStatus(uid, field, status, notes);
}

// ─── Admin Jobs ───────────────────────────────────────────────────────────────

export async function getAdminJobs(
  params: AdminJobFilters = {}
): Promise<
  ApiResponse<{ data: IJob[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  return apiGet<{ data: IJob[]; total: number; page: number; limit: number; totalPages: number }>(
    `/api/admin/jobs?${query.toString()}`
  );
}

// ─── Admin Incidents ──────────────────────────────────────────────────────────

interface AdminIncidentFilters {
  page?: number;
  severity?: string;
  incidentType?: string;
  from?: string;
  to?: string;
}

/**
 * Get all incident reports across the platform (Admin only).
 * @param params - Filters for severity, type, and date range
 */
export async function getAdminIncidents(
  params: AdminIncidentFilters = {}
): Promise<
  ApiResponse<{ incidents: IIncidentReport[]; total: number; page: number; totalPages: number }>
> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  return apiGet<{ incidents: IIncidentReport[]; total: number; page: number; totalPages: number }>(
    `/api/admin/incidents?${query.toString()}`
  );
}

/**
 * Mark an incident report as reviewed by admin.
 * @param incidentId - The incident to mark as reviewed
 */
export async function markIncidentReviewed(incidentId: string): Promise<ApiResponse<IIncidentReport>> {
  return apiPatch<IIncidentReport>('/api/admin/incidents', { incidentId });
}
