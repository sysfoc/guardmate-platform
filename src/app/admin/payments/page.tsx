'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { getAdminRevenue } from '@/lib/api/admin.api';
import { DollarSign, Activity, TrendingUp, CreditCard } from 'lucide-react';
import { usePlatformContext } from '@/context/PlatformContext';

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const { platformSettings, loading: contextLoading } = usePlatformContext();

  useEffect(() => {
    loadRevenue();
  }, []);

  const loadRevenue = async () => {
    try {
      setLoading(true);
      const res = await getAdminRevenue(1, 50);
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

  const currency = platformSettings?.platformCurrency || 'AUD';
  const summary = data?.summary || {};
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-emerald-600" />
          Revenue & Escrow Dashboard
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Monitor platform revenue, active escrow balances, and transaction history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-emerald-500 bg-gradient-to-br from-white to-emerald-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-emerald-800">Total Platform Revenue</p>
              <h3 className="text-2xl font-black text-emerald-900 mt-1">{currency} {summary.totalPlatformRevenue?.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-100 flex justify-between text-xs text-emerald-700">
            <span>Boss Fees: {currency} {summary.bossCommissionRevenue?.toFixed(2)}</span>
            <span>Guard Fees: {currency} {summary.guardCommissionRevenue?.toFixed(2)}</span>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-blue-500 bg-gradient-to-br from-white to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-800">Revenue This Month</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1">{currency} {summary.thisMonthRevenue?.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Activity size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-amber-500 bg-gradient-to-br from-white to-amber-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-800">Active Escrow Holdings</p>
              <h3 className="text-2xl font-black text-amber-900 mt-1">{currency} {summary.totalActiveEscrow?.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-2">Funds waiting for shift approval</p>
        </Card>

        <Card className="p-5 border-l-4 border-purple-500 bg-gradient-to-br from-white to-purple-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Transactions</p>
              <h3 className="text-2xl font-black text-purple-900 mt-1">{summary.totalTransactions}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-xs text-purple-700 mt-2">Avg {currency} {summary.averageTransactionValue?.toFixed(2)} / job</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Recent Completed Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-[var(--color-text-secondary)]">
            <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Job / Boss Profile</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Job Value</th>
                <th className="px-6 py-3 text-emerald-600 font-bold">Platform Take</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No completed transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx._id} className="border-b border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--color-text-primary)]">{tx.jobTitle || 'Unknown Job'}</div>
                      <div className="text-xs opacity-70">Job ID: {tx.jobId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tx.paymentMethod === 'STRIPE' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                      {tx.currency} {tx.jobBudget.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-600">
                      + {tx.currency} {(tx.platformRevenue || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
