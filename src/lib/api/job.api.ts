/**
 * job.api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side API helpers for the Job Posting & Bidding system.
 * All calls go through apiClient.ts. Fully typed with JSDoc.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  IJob,
  IBid,
  CreateJobPayload,
  UpdateJobPayload,
  SubmitBidPayload,
  JobFilters,
  BidWithJob,
} from '@/types/job.types';

// ─── Job Endpoints ────────────────────────────────────────────────────────────

/**
 * Create a new job posting (Boss only).
 * @param payload - Job creation data
 */
export async function createJob(payload: CreateJobPayload): Promise<ApiResponse<IJob>> {
  return apiPost<IJob>('/api/jobs', payload);
}

/**
 * Update an existing job (Boss only, DRAFT/OPEN status).
 * @param jobId - The job to update
 * @param payload - Fields to update
 */
export async function updateJob(jobId: string, payload: UpdateJobPayload): Promise<ApiResponse<IJob>> {
  return apiPatch<IJob>(`/api/jobs/${jobId}`, payload);
}

/**
 * Cancel (soft delete) a job (Boss only).
 * @param jobId - The job to cancel
 * @param cancelReason - Optional reason for cancellation
 */
export async function deleteJob(jobId: string, cancelReason?: string): Promise<ApiResponse<IJob>> {
  return apiDelete<IJob>(`/api/jobs/${jobId}`, {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mark a job as complete (Boss only, IN_PROGRESS jobs).
 * @param jobId - The job to complete
 */
export async function completeJob(jobId: string): Promise<ApiResponse<IJob>> {
  return apiPost<IJob>(`/api/jobs/${jobId}/complete`, {});
}

/**
 * Cancel a job with reason (Boss only).
 * @param jobId - The job to cancel
 * @param cancelReason - Required reason (min 20 chars)
 */
export async function cancelJob(jobId: string, cancelReason: string): Promise<ApiResponse<IJob>> {
  return apiPost<IJob>(`/api/jobs/${jobId}/cancel`, { cancelReason });
}

/**
 * Get paginated job listings with filters.
 * Mates see OPEN jobs; Bosses see their own.
 * @param filters - Query filters and pagination
 */
export async function getJobs(filters?: JobFilters): Promise<ApiResponse<PaginatedResponse<IJob>>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });
  }
  const query = params.toString();
  return apiGet<PaginatedResponse<IJob>>(`/api/jobs${query ? `?${query}` : ''}`);
}

/**
 * Get a single job by ID (increments view count).
 * @param jobId - The job ID
 */
export async function getJobById(jobId: string): Promise<ApiResponse<IJob>> {
  return apiGet<IJob>(`/api/jobs/${jobId}`);
}

/**
 * Get all jobs posted by the current boss with stats.
 * @param filters - Optional status filter and pagination
 */
export async function getMyJobs(filters?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<IJob> & { statusCounts: Record<string, number> }>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
  }
  const query = params.toString();
  return apiGet<PaginatedResponse<IJob> & { statusCounts: Record<string, number> }>(`/api/jobs/boss/my-jobs${query ? `?${query}` : ''}`);
}

// ─── Bid Endpoints ────────────────────────────────────────────────────────────

/**
 * Submit a bid on a job (Mate only).
 * @param jobId - The job to bid on
 * @param payload - Bid details
 */
export async function submitBid(jobId: string, payload: SubmitBidPayload): Promise<ApiResponse<IBid>> {
  return apiPost<IBid>(`/api/jobs/${jobId}/bids`, payload);
}

/**
 * Get all bids for a specific job (Boss only).
 * @param jobId - The job ID
 */
export async function getJobBids(jobId: string): Promise<ApiResponse<{ bids: IBid[]; job: IJob }>> {
  return apiGet<{ bids: IBid[]; job: IJob }>(`/api/jobs/${jobId}/bids`);
}

/**
 * Accept a bid (Boss only).
 * @param jobId - The job ID
 * @param bidId - The bid to accept
 */
export async function acceptBid(jobId: string, bidId: string): Promise<ApiResponse<IBid>> {
  return apiPatch<IBid>(`/api/jobs/${jobId}/bids/${bidId}/accept`, {});
}

/**
 * Reject a bid (Boss only).
 * @param jobId - The job ID
 * @param bidId - The bid to reject
 * @param rejectionReason - Optional reason
 */
export async function rejectBid(jobId: string, bidId: string, rejectionReason?: string): Promise<ApiResponse<IBid>> {
  return apiPatch<IBid>(`/api/jobs/${jobId}/bids/${bidId}/reject`, { rejectionReason });
}

/**
 * Withdraw a bid (Mate only, PENDING bids only).
 * @param jobId - The job ID
 * @param bidId - The bid to withdraw
 */
export async function withdrawBid(jobId: string, bidId: string): Promise<ApiResponse<IBid>> {
  return apiDelete<IBid>(`/api/jobs/${jobId}/bids/${bidId}`);
}

/**
 * Get all bids submitted by the current guard.
 * @param filters - Optional status filter and pagination
 */
export async function getMyBids(filters?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<BidWithJob>>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
  }
  const query = params.toString();
  return apiGet<PaginatedResponse<BidWithJob>>(`/api/jobs/mate/my-bids${query ? `?${query}` : ''}`);
}

// ─── Dashboard Activity Endpoints ─────────────────────────────────────────────

export interface MateActivityItem {
  bidId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  bidStatus: string;
  proposedRate: number;
  totalProposed: number;
  budgetType: string;
  createdAt: string;
}

export interface BossActivityItem {
  jobId: string;
  title: string;
  status: string;
  locationCity: string;
  totalBids: number;
  budgetAmount: number;
  budgetType: string;
  createdAt: string;
}

/**
 * Get recent activity for the Mate dashboard.
 */
export async function getMateActivity(): Promise<ApiResponse<MateActivityItem[]>> {
  return apiGet<MateActivityItem[]>('/api/dashboard/mate/activity');
}

/**
 * Get recent activity for the Boss dashboard.
 */
export async function getBossActivity(): Promise<ApiResponse<BossActivityItem[]>> {
  return apiGet<BossActivityItem[]>('/api/dashboard/boss/activity');
}

/**
 * Get the guard's active (IN_PROGRESS) jobs where they have an accepted bid.
 */
export async function getMyActiveJobs(): Promise<ApiResponse<IJob[]>> {
  return apiGet<IJob[]>('/api/jobs?status=IN_PROGRESS&myBids=ACCEPTED');
}
