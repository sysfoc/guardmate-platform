import React from 'react';
import { ReviewCard } from './ReviewCard';
import type { Review } from '@/types/review.types';
import { Pagination } from '@/components/ui/Pagination';

interface ReviewsListProps {
  reviews: Review[];
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function ReviewsList({
  reviews,
  total,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full bg-[var(--color-bg-secondary)] animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--color-border-primary)] rounded-xl bg-[var(--color-bg-secondary)]/50">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">No reviews yet.</p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
          When this user completes jobs, feedback will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review._id} review={review} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
