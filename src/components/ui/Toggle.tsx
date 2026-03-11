'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onCheckedChange,
  label,
  description,
  size = 'md',
  disabled,
  error,
  className,
  ...props
}) => {
  const sizes = {
    sm: { track: 'w-8 h-4.5', thumb: 'w-3.5 h-3.5', active: 'translate-x-3.5' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', active: 'translate-x-5' },
    lg: { track: 'w-14 h-8', thumb: 'w-7 h-7', active: 'translate-x-6' },
  };

  const handleToggle = () => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            sizes[size].track,
            checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-default)]',
            className
          )}
          {...props}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[2px] ml-[2px]',
              sizes[size].thumb,
              checked ? sizes[size].active : 'translate-x-0'
            )}
          />
        </button>
        {label && (
          <div className="flex flex-col cursor-pointer" onClick={handleToggle}>
            <span
              className={cn(
                'text-sm font-medium transition-colors select-none',
                error ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]',
                disabled ? 'text-[var(--color-text-disabled)]' : ''
              )}
            >
              {label}
            </span>
            {description && (
              <span className="text-xs text-[var(--color-text-secondary)] select-none">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
};

Toggle.displayName = 'Toggle';
