'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import {
  ShieldCheck,
  Building2,
  Clock,
  UserCheck,
  UserX,
  DollarSign,
  ArrowUpRight,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { getAdminStats } from '@/lib/api/admin.api';
import type { AdminDashboardStats, AdminActivity } from '@/types/admin.types';

// ─── Action Type Display Map ──────────────────────────────────────────────────

const actionTypeLabels: Record<string, { label: string; color: string }> = {
  USER_APPROVE: { label: 'Approved', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
  USER_REJECT: { label: 'Rejected', color: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' },
  USER_SUSPEND: { label: 'Suspended', color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' },
  USER_BAN: { label: 'Banned', color: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' },
  USER_PROMOTE: { label: 'Promoted', color: 'bg-[var(--color-info-light)] text-[var(--color-info)]' },
  USER_VIEW: { label: 'Viewed', color: 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)]' },
  USER_RESTORE: { label: 'Restored', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
  USER_UPDATE: { label: 'Updated', color: 'bg-[var(--color-info-light)] text-[var(--color-info)]' },
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const resp = await getAdminStats();
        if (resp.success) setStats(resp.data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) {
    return (
      <div className="text-center py-20 text-[var(--color-text-secondary)]">
        Failed to load system statistics. Please try again.
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Guards',
      value: stats.totalGuards,
      icon: ShieldCheck,
      iconBg: 'bg-[var(--color-role-mate-light)]',
      iconColor: 'text-[var(--color-role-mate)]',
    },
    {
      label: 'Total Bosses',
      value: stats.totalBosses,
      icon: Building2,
      iconBg: 'bg-[var(--color-role-boss-light)]',
      iconColor: 'text-[var(--color-role-boss)]',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      iconBg: 'bg-[var(--color-warning-light)]',
      iconColor: 'text-[var(--color-warning)]',
      urgent: stats.pendingApprovals > 0,
    },
    {
      label: 'Active Users',
      value: stats.activeUsers,
      icon: UserCheck,
      iconBg: 'bg-[var(--color-success-light)]',
      iconColor: 'text-[var(--color-success)]',
    },
    {
      label: 'Suspended Users',
      value: stats.suspendedUsers,
      icon: UserX,
      iconBg: 'bg-[var(--color-danger-light)]',
      iconColor: 'text-[var(--color-danger)]',
    },
    {
      label: 'Total Revenue',
      value: stats.totalRevenue,
      icon: DollarSign,
      iconBg: 'bg-[var(--color-secondary-light)]',
      iconColor: 'text-[var(--color-secondary)]',
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            System Overview
          </h1>
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            Real-time platform performance and management metrics.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]">
          <Activity className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Live Monitor</span>
        </div>
      </div>

      {/* ── Stats Grid: 3 columns for better balance ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="p-4 relative overflow-hidden group hover:shadow-md transition-all duration-300 border-none shadow-sm ring-1 ring-[var(--color-surface-border)] bg-white flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${stat.iconBg} transition-transform group-hover:scale-105 duration-300 shrink-0`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider truncate">{stat.label}</p>
                {stat.urgent && (
                  <div className="h-2 w-2 rounded-full bg-[var(--color-danger)] animate-pulse" title="Action Required" />
                )}
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums mt-0.5">
                {stat.isCurrency ? `$${stat.value.toLocaleString()}` : stat.value.toLocaleString()}
              </h3>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Two-column: Recent Approvals + Activity ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Pending Approvals */}
        <Card className="p-5 space-y-5 bg-white">
          <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-4">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-warning)]" />
              Recent Approvals
            </h2>
            <Link
              href="/admin/guards"
              className="text-[10px] font-black text-[var(--color-primary)] hover:underline flex items-center gap-1 uppercase tracking-widest bg-[var(--color-primary)]/5 px-2 py-1 rounded-md"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {stats.recentPending.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm italic">
              No pending approval requests.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPending.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-bg-subtle)]/20 hover:bg-[var(--color-surface-hover)] hover:shadow-sm transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={user.profilePhoto || undefined}
                      name={user.fullName}
                      size="sm"
                      className="h-9 w-9 ring-2 ring-white"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--color-text-primary)] truncate">
                        {user.fullName}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={user.role === 'MATE' ? 'mate' : 'boss'}
                      className="text-[9px] px-2 py-0.5 rounded-md font-bold"
                    >
                      {user.role === 'MATE' ? 'Guard' : 'Boss'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity Log */}
        <Card className="p-5 space-y-5 bg-white relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-4">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-info)]" />
              Live Activity
            </h2>
            <Link
              href="/admin/activity"
              className="text-[10px] font-black text-[var(--color-primary)] hover:underline flex items-center gap-1 uppercase tracking-widest bg-[var(--color-primary)]/5 px-2 py-1 rounded-md"
            >
              Full Log <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm italic">
              No recent activity recorded.
            </div>
          ) : (
            <div className="relative space-y-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--color-surface-border)]">
              {stats.recentActivity.map((activity: AdminActivity) => {
                const display = actionTypeLabels[activity.actionType] || {
                  label: activity.actionType,
                  color: 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)]',
                };
                return (
                  <div
                    key={activity._id}
                    className="relative pl-6 flex flex-col gap-1"
                  >
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-[var(--color-surface-border)] flex items-center justify-center z-10">
                       <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                        {activity.adminName}
                      </p>
                      <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${display.color}`}>
                        {display.label}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
                       Applied to <span className="font-bold text-[var(--color-text-primary)]">{activity.targetName || 'System'}</span>
                    </p>
                    
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[9px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[9px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
