'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Users,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Shield,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { UserProfile } from '@/types/user.types';

// ─── Nav Items ────────────────────────────────────────────────────────────────

const adminNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { label: 'Guard Approvals', icon: ShieldCheck, href: '/admin/guards' },
  { label: 'Boss Approvals', icon: Building2, href: '/admin/bosses' },
  { label: 'All Users', icon: Users, href: '/admin/users' },
  { label: 'Jobs', icon: Briefcase, href: '/admin/jobs' },
  { label: 'Incidents', icon: Shield, href: '/admin/incidents' },
  { label: 'Activity Log', icon: History, href: '/admin/activity' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  user: UserProfile;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar({
  user,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Admin Profile Card ────────────────────────────────── */}
      <div
        className={cn(
          'border-b border-[var(--color-sidebar-border)] transition-all duration-300',
          isCollapsed ? 'px-3 py-4' : 'px-5 py-6'
        )}
      >
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
          <Avatar
            src={user.profilePhoto || undefined}
            name={user.firstName}
            size={isCollapsed ? 'sm' : 'md'}
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <Badge variant="admin" size="sm" className="mt-1">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className={cn('flex-1 py-4', isCollapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative',
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-[var(--color-sidebar-item-active)] text-[var(--color-sidebar-bg)] shadow-md'
                    : 'text-white/70 hover:bg-[var(--color-sidebar-item-hover)] hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-[var(--color-sidebar-bg)]' : 'text-white/60 group-hover:text-white'
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto shrink-0" />}
                  </>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-xs font-medium rounded-lg shadow-lg border border-[var(--color-surface-border)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Collapse Toggle (desktop only) ────────────────────── */}
      <div className="hidden md:block border-t border-[var(--color-sidebar-border)] p-3">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-[var(--color-sidebar-item-hover)] transition-all duration-200"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xs font-medium">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] z-30 hidden md:block transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile Overlay ─────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile Sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-72 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] z-50 md:hidden transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-sidebar-border)]">
          <span className="text-white font-bold text-lg">Admin Panel</span>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-[var(--color-sidebar-item-hover)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
