'use client';

import React from 'react';
import { useToastContext } from '@/context/ToastContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, dismissToast } = useToastContext();

  return (
    <div
      className="fixed bottom-0 right-0 z-[var(--z-toast,9999)] flex flex-col gap-3 p-4 w-full sm:w-auto sm:max-w-[420px] pointer-events-none"
      style={{
        // Responsive alignment via CSS
      }}
    >
      <div className="flex flex-col gap-3 pointer-events-auto items-center sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
