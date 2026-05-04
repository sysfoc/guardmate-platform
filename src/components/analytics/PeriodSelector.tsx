'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface PeriodSelectorProps {
  value: PeriodType;
  dateFrom?: string;
  dateTo?: string;
  onChange: (period: PeriodType, dateFrom?: string, dateTo?: string) => void;
}

const periods: Array<{ value: PeriodType; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

export function PeriodSelector({ value, dateFrom, dateTo, onChange }: PeriodSelectorProps) {
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('custom', e.target.value, dateTo);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('custom', dateFrom, e.target.value);
  };

  return (
    <div className="w-full">
      {/* Period Pills - Horizontal scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-thin pb-2 sm:pb-0">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 shrink-0',
              'border focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20',
              value === period.value
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]'
            )}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Inputs */}
      {value === 'custom' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="date"
                value={dateFrom || ''}
                onChange={handleDateFromChange}
                className={cn(
                  'w-full sm:w-auto pl-8 pr-3 py-1.5 text-xs rounded-lg',
                  'bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]',
                  'text-[var(--color-text-primary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'
                )}
              />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">to</span>
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="date"
                value={dateTo || ''}
                onChange={handleDateToChange}
                className={cn(
                  'w-full sm:w-auto pl-8 pr-3 py-1.5 text-xs rounded-lg',
                  'bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]',
                  'text-[var(--color-text-primary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
