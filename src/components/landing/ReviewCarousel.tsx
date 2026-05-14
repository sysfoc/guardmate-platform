'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { Review } from '@/types/review.types';

interface ReviewCarouselProps {
  reviews: Review[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

const DUMMY_REVIEWS: Review[] = [
  {
    _id: 'dummy-1',
    reviewerId: 'd1',
    reviewerName: 'Sarah Mitchell',
    reviewerPhoto: null,
    reviewerRole: 'BOSS' as any,
    receiverId: 'd-r1',
    receiverRole: 'MATE' as any,
    jobId: 'd-j1',
    jobName: 'Event Security — Corporate Gala',
    rating: 5,
    comment: 'GuardMate made hiring security for our corporate event incredibly simple. The guards were professional, punctual, and the platform kept everything transparent. Highly recommended.',
    isPublic: true,
    createdAt: '2024-11-15T10:30:00Z',
    updatedAt: '2024-11-15T10:30:00Z',
  },
  {
    _id: 'dummy-2',
    reviewerId: 'd2',
    reviewerName: 'James O\'Connor',
    reviewerPhoto: null,
    reviewerRole: 'MATE' as any,
    receiverId: 'd-r2',
    receiverRole: 'BOSS' as any,
    jobId: 'd-j2',
    jobName: 'Retail Security — Night Shift',
    rating: 5,
    comment: 'As a security professional, this platform has transformed how I find consistent work. The payment system is reliable and the job matching is spot on.',
    isPublic: true,
    createdAt: '2024-10-22T14:15:00Z',
    updatedAt: '2024-10-22T14:15:00Z',
  },
  {
    _id: 'dummy-3',
    reviewerId: 'd3',
    reviewerName: 'Priya Sharma',
    reviewerPhoto: null,
    reviewerRole: 'BOSS' as any,
    receiverId: 'd-r3',
    receiverRole: 'MATE' as any,
    jobId: 'd-j3',
    jobName: 'Construction Site Patrol',
    rating: 4,
    comment: 'The dispute resolution process was fair and transparent. When we had a scheduling issue, the admin team mediated professionally and we reached a quick resolution.',
    isPublic: true,
    createdAt: '2024-12-03T09:45:00Z',
    updatedAt: '2024-12-03T09:45:00Z',
  },
];

export function ReviewCarousel({
  reviews,
  loading = false,
  title = 'What people say',
  subtitle,
}: ReviewCarouselProps) {
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setItemsPerPage(1);
      else if (window.innerWidth < 1024) setItemsPerPage(2);
      else setItemsPerPage(3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const hasReviews = reviews.length > 0;
  const displayReviews = hasReviews ? reviews : (loading ? [] : DUMMY_REVIEWS);
  const totalPages = Math.max(1, Math.ceil(displayReviews.length / itemsPerPage));

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage, reviews.length]);

  const goNext = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }, [totalPages]);

  const visible = displayReviews.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);
  const showControls = !loading && displayReviews.length > itemsPerPage;

  return (
    <section className="py-5 sm:py-6" role="region" aria-roledescription="carousel" aria-label={title}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-4">
          <h2 className="text-sm font-bold leading-6 text-[var(--color-primary)] uppercase tracking-wider">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">{subtitle}</p>
          )}
        </div>

        <div className="relative min-h-[280px]" aria-live="polite" aria-atomic="true">
          {/* Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-500">
            {loading && !hasReviews ? (
              /* Skeleton placeholders to reserve exact card dimensions while loading.
                 CSS responsive visibility matches the grid breakpoints (1/2/3 columns)
                 to eliminate hydration mismatch and prevent CLS. */
              <>
                {/* Skeleton 1 — always visible (matches mobile 1-col grid) */}
                <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-sm flex flex-col min-h-[220px] animate-pulse">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((__, sIdx) => (
                      <div key={sIdx} className="h-3.5 w-3.5 rounded-full bg-[var(--color-bg-subtle)]" />
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mb-3 flex-1">
                    <div className="h-4 w-4 rounded-full bg-[var(--color-bg-subtle)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full rounded bg-[var(--color-bg-subtle)]" />
                      <div className="h-3 w-5/6 rounded bg-[var(--color-bg-subtle)]" />
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-[var(--color-surface-border)] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-bg-subtle)]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-20 rounded bg-[var(--color-bg-subtle)]" />
                      <div className="h-2.5 w-14 rounded bg-[var(--color-bg-subtle)]" />
                    </div>
                  </div>
                </div>
                {/* Skeleton 2 — hidden on mobile, visible on sm+ (matches 2-col grid) */}
                <div className="hidden sm:flex rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-sm flex-col min-h-[220px] animate-pulse">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((__, sIdx) => (
                      <div key={sIdx} className="h-3.5 w-3.5 rounded-full bg-[var(--color-bg-subtle)]" />
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mb-3 flex-1">
                    <div className="h-4 w-4 rounded-full bg-[var(--color-bg-subtle)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full rounded bg-[var(--color-bg-subtle)]" />
                      <div className="h-3 w-5/6 rounded bg-[var(--color-bg-subtle)]" />
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-[var(--color-surface-border)] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-bg-subtle)]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-20 rounded bg-[var(--color-bg-subtle)]" />
                      <div className="h-2.5 w-14 rounded bg-[var(--color-bg-subtle)]" />
                    </div>
                  </div>
                </div>
                {/* Skeleton 3 — hidden on sm and below, visible on lg+ (matches 3-col grid) */}
                <div className="hidden lg:flex rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-sm flex-col min-h-[220px] animate-pulse">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((__, sIdx) => (
                      <div key={sIdx} className="h-3.5 w-3.5 rounded-full bg-[var(--color-bg-subtle)]" />
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mb-3 flex-1">
                    <div className="h-4 w-4 rounded-full bg-[var(--color-bg-subtle)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full rounded bg-[var(--color-bg-subtle)]" />
                      <div className="h-3 w-5/6 rounded bg-[var(--color-bg-subtle)]" />
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-[var(--color-surface-border)] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-bg-subtle)]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-20 rounded bg-[var(--color-bg-subtle)]" />
                      <div className="h-2.5 w-14 rounded bg-[var(--color-bg-subtle)]" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              visible.map((r) => (
                <div
                  key={r._id}
                  className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-sm flex flex-col animate-fadeIn min-h-[220px]"
                >
                  <div className="flex gap-0.5 mb-3" aria-hidden="true">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <Quote className="h-4 w-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5 opacity-60" aria-hidden="true" />
                    <p className="text-xs leading-5 text-[var(--color-text-secondary)] flex-grow italic">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-[var(--color-surface-border)] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
                      {r.reviewerName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{r.reviewerName}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {r.jobName}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Navigation */}
          {showControls && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-surface-border)] shadow-sm flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors z-10"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-surface-border)] shadow-sm flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors z-10"
                aria-label="Next review"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {showControls && (
          <div className="flex justify-center gap-1.5 mt-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === page ? 'w-5 bg-[var(--color-primary)]' : 'w-2 bg-[var(--color-surface-border)] hover:bg-[var(--color-text-muted)]'
                }`}
                aria-label={`Go to review page ${i + 1}`}
                aria-current={i === page ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
