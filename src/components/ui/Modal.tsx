'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}) => {
  // Focus trap and escape key logic
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  return (
    <div 
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--color-modal-overlay)] backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={() => closeOnOverlayClick && onClose()}
      />

      {/* Modal Card */}
      <div className={cn(
        'relative w-full bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl shadow-[var(--color-modal-shadow)] overflow-hidden flex flex-col',
        'animate-in zoom-in-95 fade-in duration-300 slide-in-from-bottom-4',
        sizes[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-card-border)] bg-[var(--color-card-header-bg)]">
          {title && (
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 text-[var(--color-text-secondary)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--color-card-border)] bg-[var(--color-card-header-bg)] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
