'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Toast as ToastType, ToastVariant } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode; progress: string }> = {
  success: {
    bg: 'bg-[var(--color-success-light)]',
    border: 'border-[var(--color-success)]',
    progress: 'bg-[var(--color-success)]',
    icon: (
      <svg className="w-5 h-5 text-[var(--color-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-[var(--color-danger-light)]',
    border: 'border-[var(--color-danger)]',
    progress: 'bg-[var(--color-danger)]',
    icon: (
      <svg className="w-5 h-5 text-[var(--color-danger)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-[var(--color-warning-light)]',
    border: 'border-[var(--color-warning)]',
    progress: 'bg-[var(--color-warning)]',
    icon: (
      <svg className="w-5 h-5 text-[var(--color-warning)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-[var(--color-info-light)]',
    border: 'border-[var(--color-info)]',
    progress: 'bg-[var(--color-info)]',
    icon: (
      <svg className="w-5 h-5 text-[var(--color-info)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = variantStyles[toast.variant];

  // Handle manual dismiss with animation
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={cn(
        'relative w-full max-w-[380px] overflow-hidden rounded-xl border p-4 shadow-lg transition-all duration-300',
        styles.bg,
        styles.border,
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-0.5">{styles.icon}</div>
        <div className="flex-1 min-w-0">
          {toast.title && <p className="mb-1 text-sm font-bold text-[var(--color-text-primary)]">{toast.title}</p>}
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 h-fit p-1 -mt-1 -mr-1 rounded-md hover:bg-black/5 transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      {!toast.persistent && (
        <div className="absolute bottom-0 left-0 h-1 w-full opacity-30">
          <div
            className={cn('h-full animate-toast-progress', styles.progress)}
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}
