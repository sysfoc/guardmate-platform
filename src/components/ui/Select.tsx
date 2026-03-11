'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, fullWidth = true, disabled, placeholder, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label className={cn(
            'text-sm font-medium transition-colors',
            error ? 'text-[var(--color-danger)]' : 'text-[var(--color-input-label)]',
            disabled ? 'opacity-50' : ''
          )}>
            {label}
            {props.required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}

        <div className="relative group">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              'flex h-11 w-full appearance-none rounded-lg border bg-[var(--color-input-bg)] px-4 py-2 pr-10 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50',
              error 
                ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]' 
                : 'border-[var(--color-input-border)] focus:ring-[var(--color-input-border-focus)]',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-input-placeholder)] group-focus-within:text-[var(--color-input-border-focus)] transition-colors">
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>

        {error ? (
          <p className="text-xs font-medium text-[var(--color-danger)]">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
