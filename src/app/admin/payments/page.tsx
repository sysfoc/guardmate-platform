'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getAdminRevenue } from '@/lib/api/admin.api';
import { 
  DollarSign, Activity, TrendingUp, CreditCard, Briefcase,
  Zap, Crown
} from 'lucide-react';
import { usePlatformContext } from '@/context/PlatformContext';

const TABS = [
  { key: 'all', label: 'All Payments', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { key: 'escrow', label: 'Job Escrow', icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: 'subscription', label: 'Subscriptions', icon: <Crown className="h-3.5 w-3.5" /> },
  { key: 'boost', label: 'Mate Boosts', icon: <Zap className="h-3.5 w-3.5" /> },
];

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { loading: contextLoading } = usePlatformContext();

  useEffect(() => {
    loadRevenue(activeTab);
  }, [activeTab]);

  const loadRevenue = async (category: string) => {
    try {
      setLoading(true);
      const res = await getAdminRevenue(1, 50, undefined, undefined, undefined, undefined, category);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || contextLoading) {
    return <div className="p-8 text-center text-[var(--color-text-secondary)]">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 bg-red-50 rounded-md m-6">{error}</div>;
  }

  const currency = '$';
  const summary = data?.summary || {};
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
          <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
          Revenue & Payments Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">Unified view of escrow, subscriptions, and profile boost revenue.</p>
      </div>

      {/* ─── Top Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-emerald-500 bg-gradient-to-br from-white to-emerald-50">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-800">Total Platform Revenue</p>
              <h3 className="text-2xl font-black text-emerald-900 mt-1 break-words">{currency} {summary.totalPlatformRevenue?.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-100 flex flex-col gap-1 text-xs text-emerald-700">
            <span className="flex justify-between"><span>Escrow:</span> <strong>{currency} {summary.escrowRevenue?.toFixed(2)}</strong></span>
            <span className="flex justify-between"><span>Subscriptions:</span> <strong>{currency} {summary.subscriptionRevenue?.toFixed(2)}</strong></span>
            <span className="flex justify-between"><span>Boosts:</span> <strong>{currency} {summary.boostRevenue?.toFixed(2)}</strong></span>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-blue-500 bg-gradient-to-br from-white to-blue-50">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-medium text-blue-800">Revenue This Month</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1 break-words">{currency} {summary.thisMonthRevenue?.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col gap-1 text-xs text-blue-700">
            <span className="flex justify-between"><span>Escrow:</span> <strong>{currency} {summary.escrowMonthRevenue?.toFixed(2)}</strong></span>
            <span className="flex justify-between"><span>Subs:</span> <strong>{currency} {summary.subMonthRevenue?.toFixed(2)}</strong></span>
            <span className="flex justify-between"><span>Boosts:</span> <strong>{currency} {summary.boostMonthRevenue?.toFixed(2)}</strong></span>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-amber-500 bg-gradient-to-br from-white to-amber-50">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-medium text-amber-800">Active Escrow</p>
              <h3 className="text-2xl font-black text-amber-900 mt-1 break-words">{currency} {summary.totalActiveEscrow?.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-2">Funds waiting for job completion</p>
        </Card>

        <Card className="p-5 border-l-4 border-purple-500 bg-gradient-to-br from-white to-purple-50">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Transactions</p>
              <h3 className="text-2xl font-black text-purple-900 mt-1 break-words">{summary.totalTransactions}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full text-purple-600 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-100 flex flex-col gap-1 text-xs text-purple-700">
            <span className="flex justify-between"><span>Escrow:</span> <strong>{summary.escrowTransactions}</strong></span>
            <span className="flex justify-between"><span>Subs:</span> <strong>{summary.subTransactions}</strong></span>
            <span className="flex justify-between"><span>Boosts:</span> <strong>{summary.boostTransactions}</strong></span>
          </div>
        </Card>
      </div>

      {/* ─── Category Tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Transaction History ────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
            {activeTab === 'all' ? 'Recent Transactions' : TABS.find(t => t.key === activeTab)?.label}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[var(--color-text-secondary)]">
            <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-[10px] sm:text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Type</th>
                <th className="px-4 sm:px-6 py-3 whitespace-nowrap">User / Job</th>
                <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Amount</th>
                <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Platform Revenue</th>
              </tr>
            </thead>
            <tbody className="text-[10px] sm:text-sm">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const isEscrow = tx.category === 'ESCROW';
                  const isSub = tx.category === 'SUBSCRIPTION';
                  const isBoost = tx.category === 'BOOST';

                  return (
                    <tr key={tx._id} className="border-b border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <Badge variant={isEscrow ? 'info' : isSub ? 'warning' : 'success'} className="text-[9px]">
                          {isEscrow ? 'ESCROW' : isSub ? 'SUBSCRIPTION' : 'BOOST'}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-semibold text-[var(--color-text-primary)] truncate max-w-[120px] sm:max-w-none">
                          {isEscrow ? (tx.jobTitle || 'Unknown Job') : isSub ? `Boss: ${tx.bossUid?.slice(0, 8)}...` : `Guard: ${tx.guardUid?.slice(0, 8)}...`}
                        </div>
                        <div className="text-[9px] sm:text-xs opacity-70 truncate max-w-[120px] sm:max-w-none">
                          {isEscrow ? `Job: ${tx.jobId}` : isSub ? `Plan: ${tx.planTier}` : `${tx.durationDays} days`}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-AU')}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium">
                        {tx.currency || currency} {isEscrow ? (tx.jobBudget || 0).toFixed(2) : (tx.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-bold text-emerald-600">
                        + {tx.currency || currency} {(isEscrow ? (tx.platformRevenue || 0) : (tx.amount || 0)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
