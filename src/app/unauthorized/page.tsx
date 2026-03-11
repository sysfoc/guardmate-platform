'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { UserRole } from '@/types/enums';

/**
 * Unauthorized Access Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional "Access Denied" view shown when a user lacks the required role.
 */
export default function UnauthorizedPage() {
  const { user, isBoss, isMate, isAdmin } = useUser();
  const router = useRouter();

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isBoss) return '/dashboard/boss';
    if (isMate) return '/dashboard/mate';
    return '/';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-sm text-center">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 11-8 0 4 4 0 018 0zm0 0v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-foreground">Access Denied</h1>
        <p className="text-muted-foreground mb-8">
          You don't have the required permissions to view this page. 
          {user?.role && (
            <span className="block mt-2 font-medium">
              Current Role: <span className="text-primary">{user.role}</span>
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={getDashboardLink()}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium transition-colors hover:bg-primary/90"
          >
            Go to My Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium transition-colors hover:bg-secondary/80"
          >
            Go Back
          </button>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GuardMate. All rights reserved.</p>
      </footer>

      <style jsx>{`
        .bg-background { background-color: var(--background); }
        .text-foreground { color: var(--foreground); }
        .bg-card { background-color: var(--card); }
        .border-border { border-color: var(--border); }
        .text-muted-foreground { color: var(--muted-foreground); }
        .bg-destructive-10 { background-color: rgba(var(--destructive), 0.1); }
        .text-destructive { color: var(--destructive); }
        .bg-primary { background-color: var(--primary); }
        .text-primary-foreground { color: var(--primary-foreground); }
        .bg-secondary { background-color: var(--secondary); }
        .text-secondary-foreground { color: var(--secondary-foreground); }
        .text-primary { color: var(--primary); }
      `}</style>
    </div>
  );
}
