'use client';

import * as React from 'react';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, fullWidth = true, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label 
            className={cn(
              'text-sm font-medium transition-colors',
              error ? 'text-[var(--color-danger)]' : 'text-[var(--color-input-label)]',
              disabled ? 'text-[var(--color-input-disabled-text)] opacity-50' : ''
            )}
          >
            {label}
            {props.required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}

        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-input-placeholder)] group-focus-within:text-[var(--color-input-border-focus)] transition-colors">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            disabled={disabled}
            className={cn(
              'flex h-11 w-full rounded-lg border bg-[var(--color-input-bg)] px-4 py-2 text-base transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-input-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[var(--color-input-disabled-bg)] disabled:text-[var(--color-input-disabled-text)]',
              leftIcon ? 'pl-10' : '',
              (rightIcon || isPassword) ? 'pr-10' : '',
              error 
                ? 'border-[var(--color-input-border-error)] focus-visible:ring-[var(--color-input-border-error)]' 
                : 'border-[var(--color-input-border)] focus-visible:ring-[var(--color-input-border-focus)]',
              className
            )}
            {...props}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPassword && !disabled && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-[var(--color-input-placeholder)] hover:text-[var(--color-input-border-focus)] transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            )}
            {!isPassword && rightIcon && (
              <div className="text-[var(--color-input-placeholder)] transition-colors">
                {rightIcon}
              </div>
            )}
            {error && !isPassword && !rightIcon && (
              <XCircle className="h-5 w-5 text-[var(--color-danger)]" />
            )}
          </div>
        </div>

        {error ? (
          <p className="text-xs font-medium text-[var(--color-danger)] animate-in fade-in slide-in-from-top-1">
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

Input.displayName = 'Input';
