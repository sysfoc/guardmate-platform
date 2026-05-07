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
  ({ className, label, error, indeterminate, disabled, checked, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isChecked = !!checked || !!indeterminate;

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
              checked={checked}
              className="sr-only"
              {...props}
            />
            <div className={cn(
              'h-5 w-5 rounded border-2 transition-all duration-200 flex items-center justify-center bg-white dark:bg-gray-800',
              isChecked
                ? 'border-blue-600 dark:border-blue-400'
                : 'border-gray-400 dark:border-gray-500 group-hover:border-blue-500 dark:group-hover:border-blue-400',
              'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1',
              error && 'border-red-500 group-hover:border-red-500'
            )}>
              {indeterminate ? (
                <Minus className="h-3.5 w-3.5 text-gray-900 dark:text-white stroke-[3px]" />
              ) : (
                <Check className={cn(
                  'h-3.5 w-3.5 text-blue-600 dark:text-blue-400 stroke-[3px] transition-transform duration-200',
                  isChecked ? 'scale-100' : 'scale-0'
                )} />
              )}
            </div>
          </div>
          {label && (
            <span className={cn(
              'text-sm font-medium transition-colors select-none text-gray-900 dark:text-white',
              error && 'text-red-500',
              disabled && 'text-gray-400 dark:text-gray-500'
            )}>
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="text-xs font-medium text-red-500 pl-7">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
