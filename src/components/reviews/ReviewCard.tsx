import React from 'react';
// Replaced date-fns with native Date methods
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import type { Review } from '@/types/review.types';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={review.reviewerPhoto || undefined}
            name={review.reviewerName}
            size="md"
          />
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
              {review.reviewerName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="neutral" size="sm" className="text-[10px] py-0 h-4 uppercase tracking-wider">
                {review.reviewerRole}
              </Badge>
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>

      <div className="pl-12">
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed italic">
          &quot;{review.comment}&quot;
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Job:
          </span>
          <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
            {review.jobName}
          </span>
        </div>
      </div>
    </Card>
  );
}
