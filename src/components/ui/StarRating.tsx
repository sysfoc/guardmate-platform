import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showCount?: boolean;
  totalCount?: number;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StarRating({
  rating,
  size = 'md',
  interactive = false,
  showCount = false,
  totalCount,
  onChange,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`Rating: ${rating} out of 5 stars`}
    >
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const starProps = {
            className: `${sizes[size]} ${
              star <= displayRating
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`,
            'aria-hidden': true as const,
          };

          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                aria-label={`Rate ${star} out of 5`}
                aria-pressed={star <= rating}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => onChange?.(star)}
                className="cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-sm"
              >
                <Star {...starProps} />
              </button>
            );
          }

          return (
            <span key={star} className="cursor-default">
              <Star {...starProps} />
            </span>
          );
        })}
      </div>
      {showCount && (
        <span className={`text-[var(--color-text-secondary)] font-medium ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
          {rating.toFixed(1)} {totalCount !== undefined && `(${totalCount})`}
        </span>
      )}
    </div>
  );
}
