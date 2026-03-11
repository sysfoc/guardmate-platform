'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, indeterminate, disabled, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    // Combine local ref with forwarded ref
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className="flex flex-col gap-1.5">
        <label className={cn(
          'flex items-center gap-2.5 cursor-pointer group',
          disabled ? 'cursor-not-allowed opacity-50' : ''
        )}>
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              ref={inputRef}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            <div className={cn(
              'h-5 w-5 rounded border-2 transition-all duration-200 flex items-center justify-center',
              'bg-transparent border-[var(--color-border-default)] group-hover:border-[var(--color-primary)]',
              'peer-checked:bg-[var(--color-primary)] peer-checked:border-[var(--color-primary)]',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus-ring)] peer-focus-visible:ring-offset-1',
              indeterminate && 'bg-[var(--color-primary)] border-[var(--color-primary)]',
              error && 'border-[var(--color-danger)] group-hover:border-[var(--color-danger)]'
            )}>
              {indeterminate ? (
                <Minus className="h-3.5 w-3.5 text-white stroke-[3px]" />
              ) : (
                <Check className="h-3.5 w-3.5 text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
              )}
            </div>
          </div>
          {label && (
            <span className={cn(
              'text-sm font-medium transition-colors select-none',
              error ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]',
              disabled ? 'text-[var(--color-text-disabled)]' : ''
            )}>
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="text-xs font-medium text-[var(--color-danger)] pl-7">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
