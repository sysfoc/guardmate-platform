'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--color-bg-subtle)]',
        className
      )}
    />
  );
}

/**
 * DashboardSkeleton
 * Shown while user data is loading. Mirrors the stat-card + two-column
 * layout used by mate, boss, and admin dashboards.
 */
export function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBox className="h-9 w-72" />
          <SkeletonBox className="h-5 w-56" />
        </div>
        <div className="flex items-center gap-3 bg-[var(--color-bg-secondary)] p-2 rounded-xl border border-[var(--color-border-primary)]">
          <SkeletonBox className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 pr-2">
            <SkeletonBox className="h-4 w-28" />
            <SkeletonBox className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton — 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl p-6 space-y-3"
          >
            <SkeletonBox className="h-8 w-8 rounded-lg" />
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-8 w-16" />
            <SkeletonBox className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Two-column main area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side card */}
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl p-6 space-y-4 lg:col-span-1">
          <SkeletonBox className="h-6 w-32 mb-2" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* Right side card */}
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px] lg:col-span-2">
          <SkeletonBox className="h-16 w-16 rounded-full" />
          <SkeletonBox className="h-6 w-48" />
          <SkeletonBox className="h-4 w-72" />
          <SkeletonBox className="h-4 w-64" />
        </div>
      </div>
    </div>
  );
}
