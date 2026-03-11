'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
  duration: number;
  persistent: boolean;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  persistent?: boolean;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, variant: ToastVariant, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant, options: ToastOptions = {}) => {
      const id = Math.random().toString(36).substring(2, 9);
      const { title, duration = 4000, persistent = false } = options;

      const newToast: Toast = {
        id,
        message,
        title,
        variant,
        duration,
        persistent,
      };

      setToasts((prev) => {
        // Max 5 toasts
        const next = [...prev, newToast];
        if (next.length > 5) {
          return next.slice(next.length - 5);
        }
        return next;
      });

      if (!persistent) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = (message: string, title?: string) => showToast(message, 'success', { title });
  const error = (message: string, title?: string) => showToast(message, 'error', { title });
  const warning = (message: string, title?: string) => showToast(message, 'warning', { title });
  const info = (message: string, title?: string) => showToast(message, 'info', { title });

  const clearAll = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        clearAll,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
