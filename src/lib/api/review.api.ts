import { apiGet } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { Review, ReviewStats, PaginatedReviews } from '@/types/review.types';

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
