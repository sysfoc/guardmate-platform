'use client';

import React from 'react';
import { JobStatus } from '@/types/enums';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [JobStatus.DRAFT]: {
    label: 'Draft',
    className: 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)] border-[var(--color-badge-border)]',
  },
  [JobStatus.OPEN]: {
    label: 'Open',
    className: 'bg-[var(--color-info-light)] text-[var(--color-info)] border-[var(--color-info)]/20',
  },
  [JobStatus.FILLED]: {
    label: 'Hired',
    className: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/20',
  },
  [JobStatus.IN_PROGRESS]: {
    label: 'In Progress',
    className: 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20 job-status-pulse',
  },
  [JobStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-[var(--color-success-light)] text-[var(--color-success-dark,var(--color-success))] border-[var(--color-success)]/30',
  },
  [JobStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger)]/20',
  },
  [JobStatus.EXPIRED]: {
    label: 'Expired',
    className: 'bg-[var(--color-danger-light)]/50 text-[var(--color-text-muted)] border-[var(--color-danger)]/10',
  },
};

interface JobStatusBadgeProps {
  status: JobStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export function JobStatusBadge({ status, className, size = 'sm' }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-wider border rounded-full whitespace-nowrap',
        size === 'sm' ? 'text-[9px] px-2 py-0.5 h-5' : 'text-[10px] px-2.5 py-1 h-6',
        config.className,
        className
      )}
    >
      {status === JobStatus.IN_PROGRESS && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
