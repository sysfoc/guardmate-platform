'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { CreditCard, Users, TrendingUp, AlertTriangle, Search, X, Filter } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';
import { SubscriptionStatus } from '@/types/enums';
import toast from 'react-hot-toast';

interface SubscriptionRow {
  _id: string;
  bossUid: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  amount: number | null;
  currency: string;
  lastPaymentAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  bossName: string;
  companyName: string;
  bossEmail: string;
}

interface SubscriptionStats {
  total: number;
  active: number;
  lapsed: number;
  cancelled: number;
  monthlyRecurringRevenue: number;
}

function formatDate(d: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'LAPSED': return 'danger';
    case 'CANCELLED': return 'warning';
    default: return 'neutral';
  }
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.set('page', String(page));
      query.set('limit', '20');
      if (filterStatus) query.set('status', filterStatus);

      const res = await apiGet<{
        data: SubscriptionRow[];
        stats: SubscriptionStats;
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/admin/subscriptions?${query.toString()}`);

      setSubscriptions(res.data.data);
      setStats(res.data.stats);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--color-primary)]" />
            Boss Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Monitor and manage Boss monthly subscription plans.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-[var(--color-surface)] px-3 py-2 rounded-xl border border-[var(--color-surface-border)] shadow-sm">
            <Filter className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-[var(--color-text-primary)] outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={SubscriptionStatus.ACTIVE}>Active</option>
              <option value={SubscriptionStatus.LAPSED}>Lapsed</option>
              <option value={SubscriptionStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
          {filterStatus && (
            <button
              onClick={() => { setFilterStatus(''); setPage(1); }}
              className="flex items-center gap-1 text-xs font-bold text-[var(--color-danger)] hover:opacity-70 transition-opacity px-2 py-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Subscriptions" value={stats.total} icon={<Users />} variant="blue" />
          <StatCard label="Active" value={stats.active} icon={<CreditCard />} variant="emerald" />
          <StatCard label="Lapsed" value={stats.lapsed} icon={<AlertTriangle />} variant="rose" />
          <StatCard label="Cancelled" value={stats.cancelled} icon={<X />} variant="amber" />
          <StatCard
            label="Monthly Recurring Revenue"
            value={`$${stats.monthlyRecurringRevenue.toLocaleString()}`}
            icon={<TrendingUp />}
            variant="emerald"
          />
        </div>
      )}

      {/* Subscriptions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-5 py-3">Boss</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Period End</th>
                <th className="px-5 py-3">Last Payment</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <div className="h-4 w-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">{sub.bossName}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">{sub.bossEmail}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">{sub.companyName}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={statusVariant(sub.status)} className="text-[9px]">
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-[var(--color-text-primary)]">
                      {sub.amount ? `$${sub.amount.toFixed(2)}` : '—'} <span className="text-[9px] text-[var(--color-text-tertiary)]">{sub.currency}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">{formatDate(sub.currentPeriodEnd)}</td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">{formatDate(sub.lastPaymentAt)}</td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">{formatDate(sub.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
