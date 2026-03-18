import { apiGet, apiPost } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { Review, ReviewStats, PaginatedReviews, SubmitReviewPayload, PendingReview } from '@/types/review.types';

/**
 * Fetches reviews for a specific user (the receiver).
 * @param uid The user ID to get reviews for.
 * @param page The page number for pagination.
 * @param limit The number of reviews per page.
 */
export async function getReviewsForUser(
  uid: string,
  page = 1,
  limit = 10
): Promise<ApiResponse<PaginatedReviews>> {
  return apiGet<PaginatedReviews>(`/api/reviews/${uid}?page=${page}&limit=${limit}`);
}

/**
 * Fetches review statistics for a specific user.
 * @param uid The user ID to get stats for.
 */
export async function getReviewStats(uid: string): Promise<ApiResponse<ReviewStats>> {
  return apiGet<ReviewStats>(`/api/reviews/${uid}/stats`);
}

/**
 * Fetches the current authenticated user's reviews (where they are the receiver).
 */
export async function getMyReviews(page = 1, limit = 10): Promise<ApiResponse<PaginatedReviews>> {
  return apiGet<PaginatedReviews>(`/api/reviews/me?page=${page}&limit=${limit}`);
}

/**
 * Submits a new review for a completed job.
 */
export async function submitReview(payload: SubmitReviewPayload): Promise<ApiResponse<Review>> {
  return apiPost<Review>('/api/reviews', payload);
}

/**
 * Fetches the current authenticated user's pending reviews.
 */
export async function getMyPendingReviews(): Promise<ApiResponse<PendingReview[]>> {
  return apiGet<PendingReview[]>('/api/reviews/my-pending');
}
