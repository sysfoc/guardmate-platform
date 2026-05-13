'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw,
  Download,
  Users,
  Briefcase,
  DollarSign,
  ShieldAlert,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  Star,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PeriodSelector, PeriodType } from '@/components/analytics/PeriodSelector';
import { getAdminAnalyticsOverview } from '@/lib/api/admin.api';
import type { AdminAnalyticsOverview, TopRatedGuard, TopBoss, RevenueByPeriodItem } from '@/types/admin.types';
import { cn } from '@/lib/utils';

// ─── Stat Card Component ──────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean } | null;
  badge?: { value: number; variant: 'danger' | 'warning' | 'success' };
  className?: string;
}

function StatCard({ icon, label, value, trend, badge, className }: StatCardProps) {
  return (
    <Card className={cn('p-4 sm:p-5 relative overflow-hidden group hover:shadow-md transition-shadow', className)}>
      <div className="flex flex-col h-full">
        {/* Top row: Icon + Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
            {icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            {badge && badge.value > 0 && (
              <Badge 
                variant={badge.variant} 
                className="text-[10px] px-2 py-0.5 font-semibold"
              >
                {badge.value}
              </Badge>
            )}
            {trend && (
              <div className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                trend.isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
              )}>
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.isPositive ? '+' : ''}{trend.value}%
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom: Label + Value */}
        <div className="mt-auto">
          <p className="text-[11px] sm:text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            {label}
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
            {value}
          </h3>
        </div>
      </div>
    </Card>
  );
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="h-11 w-11 rounded-xl bg-[var(--color-bg-subtle)] animate-pulse" />
          <div className="h-5 w-8 rounded-full bg-[var(--color-bg-subtle)] animate-pulse" />
        </div>
        <div className="mt-auto space-y-2">
          <div className="h-3 w-24 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
          <div className="h-7 w-20 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="w-full rounded-lg bg-[var(--color-bg-subtle)] animate-pulse" style={{ height }} />
  );
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: string): string {
  const symbols: Record<string, string> = { AUD: '$', USD: '$', EUR: '$', GBP: '$' };
  const symbol = symbols[currency] || currency;
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

// ─── Chart Colors ───────────────────────────────────────────────────────────

// ─── Main Page Component ────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const period = (searchParams.get('period') as PeriodType) || 'month';
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const resp = await getAdminAnalyticsOverview({
        period,
        dateFrom,
        dateTo,
      });
      
      if (resp.success) {
        setData(resp.data);
      } else {
        setError(resp.message || 'Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePeriodChange = useCallback((newPeriod: PeriodType, newDateFrom?: string, newDateTo?: string) => {
    const params = new URLSearchParams();
    params.set('period', newPeriod);
    if (newDateFrom) params.set('dateFrom', newDateFrom);
    if (newDateTo) params.set('dateTo', newDateTo);
    router.push(`/admin/analytics?${params.toString()}`);
  }, [router]);

  const handleExport = useCallback(() => {
    if (!data) return;
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      period: data.period,
      summary: {
        totalUsers: data.platformOverview.totalUsers,
        totalJobs: data.jobsMarketplace.totalJobsPosted,
        totalRevenue: data.revenueFinance.totalPlatformRevenue + data.revenueFinance.totalSubscriptionRevenue,
        openDisputes: data.disputes.openDisputes,
      },
      platformOverview: data.platformOverview,
      jobsMarketplace: data.jobsMarketplace,
      revenueFinance: data.revenueFinance,
      guardPerformance: data.guardPerformance,
      bossActivity: data.bossActivity,
      disputes: data.disputes,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  // ─── Platform Overview Stats ──────────────────────────────────────────────
  const platformStats = useMemo(() => {
    if (!data) return null;
    const { platformOverview, jobsMarketplace, revenueFinance, disputes, currency } = data;
    
    return [
      {
        icon: <Users className="h-5 w-5" />,
        label: 'Total Users',
        value: formatNumber(platformOverview.totalUsers),
      },
      {
        icon: <Briefcase className="h-5 w-5" />,
        label: 'Total Jobs',
        value: formatNumber(jobsMarketplace.totalJobsPosted),
      },
      {
        icon: <DollarSign className="h-5 w-5" />,
        label: 'Total Revenue',
        value: formatCurrency(
          revenueFinance.totalPlatformRevenue + revenueFinance.totalSubscriptionRevenue,
          currency
        ),
      },
      {
        icon: <DollarSign className="h-5 w-5" />,
        label: 'Active Escrow',
        value: formatCurrency(revenueFinance.totalEscrowHeld, currency),
      },
      {
        icon: <ShieldAlert className="h-5 w-5" />,
        label: 'Open Disputes',
        value: formatNumber(disputes.openDisputes),
        badge: disputes.openDisputes > 0 ? { value: disputes.openDisputes, variant: 'danger' as const } : undefined,
      },
      {
        icon: <Clock className="h-5 w-5" />,
        label: 'Pending Approvals',
        value: formatNumber(platformOverview.pendingApprovals),
        badge: platformOverview.pendingApprovals > 0 ? { value: platformOverview.pendingApprovals, variant: 'warning' as const } : undefined,
      },
      {
        icon: <CreditCard className="h-5 w-5" />,
        label: 'Active Subscriptions',
        value: formatNumber(revenueFinance.activeSubscriptions),
      },
      {
        icon: <DollarSign className="h-5 w-5" />,
        label: 'Subscription Revenue',
        value: formatCurrency(revenueFinance.totalSubscriptionRevenue, currency),
      },
      {
        icon: <TrendingUp className="h-5 w-5" />,
        label: 'Monthly Recurring Revenue',
        value: formatCurrency(revenueFinance.monthlyRecurringRevenue, currency),
      },
    ];
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-full bg-[var(--color-danger-light)] mb-4">
          <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          Failed to load analytics data
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-md">
          {error}
        </p>
        <Button onClick={fetchData} variant="primary" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg-base)]/95 backdrop-blur-sm pb-3 sm:pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              Analytics & Reporting
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
              {data?.period.label || 'Loading...'} • {data?.currency ? '$' : '$'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchData}
              variant="secondary"
              className="gap-2 text-xs sm:text-sm"
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={handleExport}
              variant="primary"
              className="gap-2 text-xs sm:text-sm"
              disabled={!data || isLoading}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mt-3 sm:mt-4">
          <PeriodSelector
            value={period}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={handlePeriodChange}
          />
        </div>
      </div>

      {/* ─── Platform Overview Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {isLoading ? (
          Array.from({ length: 9 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : platformStats?.map((stat, index) => (
          <StatCard
            key={index}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            badge={stat.badge}
          />
        ))}
      </div>

      {/* ─── Revenue Chart ──────────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
            Revenue Over Time
          </h2>
        </div>
        
        {isLoading ? (
          <ChartSkeleton height={200} />
        ) : data?.revenueFinance.revenueByPeriod.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
            No revenue data for this period
          </div>
        ) : (
          <div className="h-[200px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.revenueFinance.revenueByPeriod || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-text-muted)"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-text-muted)"
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-bg-elevated)', 
                    border: '1px solid var(--color-surface-border)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Job Revenue" 
                  stroke="var(--color-primary)" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-primary)' }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="subscriptionRevenue" 
                  name="Subscription Revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#8b5cf6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="transactions" 
                  name="Transactions" 
                  stroke="var(--color-secondary)" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-secondary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ─── Revenue Breakdown Section ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Commission Breakdown */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] mb-4">
            Commission Breakdown
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-8 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
              <div className="h-4 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
              <div className="h-8 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Boss Commission</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {formatCurrency(data?.revenueFinance.totalBossCommission || 0, data?.currency || 'AUD')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--color-text-muted)]">Guard Commission</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {formatCurrency(data?.revenueFinance.totalGuardCommission || 0, data?.currency || 'AUD')}
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              {data && (data.revenueFinance.totalBossCommission + data.revenueFinance.totalGuardCommission > 0) && (
                <div className="h-3 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                    style={{ 
                      width: `${(data.revenueFinance.totalBossCommission / (data.revenueFinance.totalBossCommission + data.revenueFinance.totalGuardCommission)) * 100}%` 
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Financial Summary */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] mb-4">
            Financial Summary
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Total Paid Out', value: data?.revenueFinance.totalPaidOut || 0 },
                { label: 'Held in Escrow', value: data?.revenueFinance.totalEscrowHeld || 0 },
                { label: 'Average Job Value', value: data?.revenueFinance.averageJobValue || 0 },
                { label: 'Total Withdrawals', value: data?.revenueFinance.totalWithdrawals || 0 },
                { label: 'Subscription Revenue', value: data?.revenueFinance.totalSubscriptionRevenue || 0 },
                { label: 'MRR (Active)', value: data?.revenueFinance.monthlyRecurringRevenue || 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatCurrency(item.value, data?.currency || 'AUD')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Guard Performance Section ──────────────────────────────────────── */}
      <div className="space-y-4 sm:space-y-5">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)]">
          Guard Performance
        </h2>
        
        {/* Guard Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-[var(--color-warning)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Average Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                    {data?.guardPerformance.averageGuardRating.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-sm text-[var(--color-warning)]">★</span>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Reliability Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xl sm:text-2xl font-bold',
                    (data?.guardPerformance.averageReliabilityScore || 0) > 80 ? 'text-[var(--color-success)]' :
                    (data?.guardPerformance.averageReliabilityScore || 0) > 50 ? 'text-[var(--color-warning)]' :
                    'text-[var(--color-danger)]'
                  )}>
                    {data?.guardPerformance.averageReliabilityScore.toFixed(0) || 0}%
                  </span>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Total Incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                    {data?.guardPerformance.totalIncidentsReported || 0}
                  </span>
                  <div className="flex gap-1">
                    {data && data.guardPerformance.incidentsBySeverity.critical > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" title="Critical" />
                    )}
                    {data && data.guardPerformance.incidentsBySeverity.high > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" title="High" />
                    )}
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-[var(--color-info)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Shift Completion</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                    {data?.guardPerformance.shiftCompletionRate.toFixed(0) || 0}%
                  </span>
                  <div className="h-1.5 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-info)] rounded-full transition-all"
                      style={{ width: `${data?.guardPerformance.shiftCompletionRate || 0}%` }}
                    />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Top Rated Guards Table */}
        <Card className="p-4 sm:p-5 overflow-hidden">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
            Top Rated Guards
          </h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
              ))}
            </div>
          ) : data?.guardPerformance.topRatedGuards.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
              No guards with reviews yet
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--color-surface-border)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Rank</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Guard</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Rating</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Jobs</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.guardPerformance.topRatedGuards.map((guard, index) => (
                    <tr 
                      key={guard.uid} 
                      className="border-b border-[var(--color-surface-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <span className="text-sm font-semibold text-[var(--color-text-muted)]">#{index + 1}</span>
                      </td>
                      <td className="py-3 px-3">
                        <Link href={`/admin/guards/${guard.uid}`} className="flex items-center gap-2">
                          <Avatar src={guard.photo} name={guard.name} size="sm" />
                          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {guard.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[var(--color-warning)]">{guard.rating.toFixed(1)}</span>
                          <Star className="h-3 w-3 text-[var(--color-warning)] fill-current" />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-[var(--color-text-secondary)]">{guard.totalJobsCompleted}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-[var(--color-text-secondary)]">{guard.totalReviews}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ─── Boss Activity Section ──────────────────────────────────────────── */}
      <div className="space-y-4 sm:space-y-5">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)]">
          Boss Activity
        </h2>
        
        {/* Boss Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-[var(--color-role-boss)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Active Bosses</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                  {data?.bossActivity.totalActiveBosses || 0}
                </span>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-[var(--color-warning)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Average Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                    {data?.bossActivity.averageBossRating.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-sm text-[var(--color-warning)]">★</span>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Bosses with Strikes</span>
                </div>
                <span className={cn(
                  'text-xl sm:text-2xl font-bold',
                  (data?.bossActivity.bossesWithCancellationStrikes || 0) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'
                )}>
                  {data?.bossActivity.bossesWithCancellationStrikes || 0}
                </span>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-[var(--color-info)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">Jobs Per Boss/Month</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                  {data?.bossActivity.averageJobPostingFrequency.toFixed(1) || '0.0'}
                </span>
              </Card>
            </>
          )}
        </div>

        {/* Top Bosses Table */}
        <Card className="p-4 sm:p-5 overflow-hidden">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
            Top Bosses
          </h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-[var(--color-bg-subtle)] rounded animate-pulse" />
              ))}
            </div>
          ) : data?.bossActivity.topBosses.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
              No active bosses yet
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--color-surface-border)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Rank</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Boss</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Jobs Posted</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Completion Rate</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.bossActivity.topBosses.map((boss, index) => (
                    <tr 
                      key={boss.uid} 
                      className="border-b border-[var(--color-surface-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <span className="text-sm font-semibold text-[var(--color-text-muted)]">#{index + 1}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {boss.company}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">{boss.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-[var(--color-text-secondary)]">{boss.totalJobsPosted}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          'text-sm font-medium',
                          boss.completionRate >= 80 ? 'text-[var(--color-success)]' :
                          boss.completionRate >= 50 ? 'text-[var(--color-warning)]' :
                          'text-[var(--color-danger)]'
                        )}>
                          {boss.completionRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[var(--color-warning)]">{boss.averageRating.toFixed(1)}</span>
                          <Star className="h-3 w-3 text-[var(--color-warning)] fill-current" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ─── Quick Actions Section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          { 
            label: 'Pending Approvals', 
            href: '/admin/guards', 
            icon: <Clock className="h-4 w-4" />,
            count: data?.platformOverview.pendingApprovals,
          },
          { 
            label: 'Revenue Report', 
            href: '/admin/payments', 
            icon: <DollarSign className="h-4 w-4" />,
          },
          { 
            label: 'User Management', 
            href: '/admin/users', 
            icon: <Users className="h-4 w-4" />,
          },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[var(--color-bg-subtle)] hover:bg-[var(--color-surface-hover)] transition-colors group"
          >
            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors shrink-0">
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)] block truncate">
                {action.label}
              </span>
              {action.count !== undefined && action.count > 0 && (
                <Badge variant="warning" className="text-[10px] mt-1">
                  {action.count} pending
                </Badge>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
