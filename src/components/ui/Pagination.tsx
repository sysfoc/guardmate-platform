'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total number of items (used for "Showing X–Y of Z") */
  totalItems?: number;
  /** Items displayed per page (used for "Showing X–Y of Z") */
  itemsPerPage?: number;
  /** Whether to show "Showing X–Y of Z results" label */
  showItemCount?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  showItemCount = false,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && !showItemCount) return null;

  // Build page numbers: max 5 visible + ellipsis
  const getPages = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis-end', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages);
    }
    return pages;
  };

  // Calculate "Showing X–Y of Z"
  const showingFrom = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const showingTo = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 py-4', className)}>
      {/* Item count label */}
      {showItemCount && totalItems !== undefined && totalItems > 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] order-2 sm:order-1">
          Showing <span className="font-semibold text-[var(--color-text-primary)]">{showingFrom}–{showingTo}</span> of{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">{totalItems.toLocaleString()}</span> results
        </p>
      ) : (
        <div className="order-2 sm:order-1" />
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 order-1 sm:order-2">
          {/* Previous */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[var(--color-surface-border)] text-sm font-medium text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page numbers — hidden on very small screens */}
          <div className="hidden xs:flex items-center gap-1">
            {getPages().map((page, idx) =>
              typeof page === 'string' ? (
                <span key={page + idx} className="px-1.5 text-[var(--color-text-muted)]">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    'min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all',
                    currentPage === page
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Mobile page indicator */}
          <span className="xs:hidden text-sm font-medium text-[var(--color-text-secondary)] px-2">
            {currentPage} / {totalPages}
          </span>

          {/* Next */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[var(--color-surface-border)] text-sm font-medium text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
