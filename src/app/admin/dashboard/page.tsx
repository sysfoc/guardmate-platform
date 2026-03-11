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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
          System Overview
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          Real-time platform performance and management metrics.
        </p>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none shadow-sm ring-1 ring-[var(--color-surface-border)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              {stat.urgent && (
                <Badge variant="danger" size="sm" dot>
                  Action Required
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">{stat.label}</p>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums mt-1">
              {stat.isCurrency ? `$${stat.value.toLocaleString()}` : stat.value.toLocaleString()}
            </h3>
          </Card>
        ))}
      </div>

      {/* ── Two-column: Recent Approvals + Activity ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Pending Approvals */}
        <Card className="lg:col-span-2 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--color-warning)]" />
              Recent Approval Requests
            </h2>
            <Link
              href="/admin/guards"
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {stats.recentPending.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">
              No pending approval requests.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPending.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={user.profilePhoto || undefined}
                      name={user.fullName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={user.role === 'MATE' ? 'mate' : 'boss'}
                      size="sm"
                    >
                      {user.role === 'MATE' ? 'Guard' : 'Boss'}
                    </Badge>
                    <Badge variant="warning" size="sm">
                      Pending
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity Log */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--color-info)]" />
              Activity Log
            </h2>
            <Link
              href="/admin/activity"
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)] text-sm">
              No recent activity.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((activity: AdminActivity) => {
                const display = actionTypeLabels[activity.actionType] || {
                  label: activity.actionType,
                  color: 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)]',
                };
                return (
                  <div
                    key={activity._id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${display.color}`}>
                      {display.label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[var(--color-text-primary)] truncate text-xs">
                        <span className="font-semibold">{activity.adminName}</span>
                        {' → '}
                        <span>{activity.targetName || 'System'}</span>
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        {new Date(activity.createdAt).toLocaleString()}
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
