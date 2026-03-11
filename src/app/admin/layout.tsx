'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { UserRole } from '@/types/enums';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!isLoading && (!user || user.role !== UserRole.ADMIN)) {
      router.replace('/login?redirectTo=/admin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-base)]">
        {/* Top bar skeleton */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-[var(--color-nav-bg)] border-b border-[var(--color-nav-border)] z-40 flex items-center px-6">
          <div className="h-8 w-32 bg-[var(--color-bg-subtle)] rounded-lg animate-pulse" />
        </div>
        <div className="flex pt-16">
          <div className="w-64 hidden md:block shrink-0" />
          <main className="flex-1 p-6 md:p-10">
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* ── Top Navbar ──────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--color-nav-bg)] border-b border-[var(--color-nav-border)] z-40 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--color-nav-item-hover-bg)] text-[var(--color-nav-text)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            <span className="text-lg font-bold text-[var(--color-text-primary)]">
              Guard<span className="text-[var(--color-secondary)]">Mate</span>
            </span>
            <span className="hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-role-admin-light)] text-[var(--color-role-admin)] border border-[var(--color-role-admin)]/20">
              Admin Panel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <span>{user.firstName} {user.lastName}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold">
            {user.firstName.charAt(0)}
          </div>
        </div>
      </header>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <AdminSidebar
        user={user}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((p) => !p)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* ── Main Content ───────────────────────────────────────── */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300 ease-in-out',
          isCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
        )}
      >
        <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
