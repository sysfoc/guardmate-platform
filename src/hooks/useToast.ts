'use client';

import { useToastContext } from '@/context/ToastContext';

export function useToast() {
  const context = useToastContext();

  return {
    success: context.success,
    error: context.error,
    warning: context.warning,
    info: context.info,
    showToast: context.showToast,
    dismissToast: context.dismissToast,
    clearAll: context.clearAll,
    toasts: context.toasts,
  };
}
