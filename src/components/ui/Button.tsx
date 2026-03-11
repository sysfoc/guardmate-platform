'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, fullWidth, leftIcon, rightIcon, children, ...props }, ref) => {
    
    // Base styles
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 disabled:bg-[var(--color-btn-disabled-bg)] disabled:text-[var(--color-btn-disabled-text)] disabled:cursor-not-allowed active:scale-[0.98]';
    
    // Variant styles using CSS variables
    const variants = {
      primary: 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] hover:bg-[var(--color-btn-primary-hover-bg)]',
      secondary: 'bg-[var(--color-btn-secondary-bg)] text-[var(--color-btn-secondary-text)] hover:bg-[var(--color-btn-secondary-hover-bg)]',
      outline: 'border border-[var(--color-btn-outline-border)] bg-transparent text-[var(--color-btn-outline-text)] hover:bg-[var(--color-btn-outline-hover-bg)]',
      ghost: 'bg-transparent text-[var(--color-btn-ghost-text)] hover:bg-[var(--color-btn-ghost-hover-bg)]',
      danger: 'bg-[var(--color-btn-danger-bg)] text-[var(--color-btn-danger-text)] hover:bg-[var(--color-btn-danger-hover-bg)]',
      success: 'bg-[var(--color-btn-success-bg)] text-[var(--color-btn-success-text)] hover:bg-[var(--color-btn-success-hover-bg)]',
    };

    // Size styles
    const sizes = {
      xs: 'h-8 px-3 text-xs gap-1.5',
      sm: 'h-9 px-4 text-sm gap-2',
      md: 'h-10 px-5 text-base gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
      xl: 'h-14 px-8 text-xl gap-3',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin h-[1.2em] w-[1.2em]" />
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
