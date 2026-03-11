/**
 * src/app/(auth)/layout.tsx
 *
 * Auth group layout — wraps login, register, forgot-password, verify-email.
 * Providers (AuthProvider, UserProvider, ThemeProvider) and globals.css
 * are handled by the ROOT layout at src/app/layout.tsx.
 * This file just adds the centered card shell for auth pages.
 */

import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="bg-[var(--color-primary)] p-2 rounded-xl group-hover:opacity-90 transition-opacity">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
          GuardMate
        </span>
      </Link>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl shadow-lg overflow-hidden">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        &copy; {new Date().getFullYear()} GuardMate. All rights reserved.
      </p>
    </div>
  );
}