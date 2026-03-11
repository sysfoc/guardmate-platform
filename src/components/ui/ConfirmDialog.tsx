'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. If you leave now, your changes will be lost.',
  confirmLabel = 'Discard Changes',
  cancelLabel = 'Keep Editing',
  variant = 'warning',
}: ConfirmDialogProps) {
  // Trap Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconColor =
    variant === 'danger'
      ? 'text-[var(--color-danger)] bg-[var(--color-danger-light)]'
      : 'text-[var(--color-warning)] bg-[var(--color-warning-light)]';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl shadow-xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-200 p-6 space-y-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconColor}`}>
          <AlertTriangle className="h-6 w-6" />
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h3>
          {typeof message === 'string' ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={onCancel}
            className="border border-[var(--color-surface-border)]"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
