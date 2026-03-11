'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { getAdminActivity } from '@/lib/api/admin.api';
import { AdminActionType } from '@/types/admin.types';
import type { AdminActivity } from '@/types/admin.types';
import { History, Globe, Link2, Filter } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

function AdminActivityPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const actionType = searchParams.get('actionType') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const updateUrl = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, val]) => {
      if (val === null || val === '') newParams.delete(key);
      else newParams.set(key, val);
    });
    if (!params.hasOwnProperty('page') && searchParams.get('page') !== '1') {
      newParams.set('page', '1');
    }
    router.push(`/admin/activity?${newParams.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    async function fetchActivity() {
      setIsLoading(true);
      try {
        const resp = await getAdminActivity({ page, limit: ITEMS_PER_PAGE, actionType, dateFrom, dateTo });
        if (resp.success) {
          setActivities(resp.data.activities);
          setTotal(resp.data.total);
          setTotalPages(resp.data.totalPages);
        }
      } catch (err) {
        console.error('Fetch activity failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
  }, [page, actionType, dateFrom, dateTo]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
          <History className="h-6 w-6 text-slate-500" />
          System Activity Log
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Audit trail of all administrative actions performed on the platform.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-4 items-end bg-[var(--color-bg-subtle)]">
        <div className="w-full sm:w-auto flex-1 md:flex-none md:w-64">
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Action Type</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            value={actionType}
            onChange={(e) => updateUrl({ actionType: e.target.value })}
          >
            <option value="">All Actions</option>
            {Object.values(AdminActionType).map(type => (
              <option key={type} value={type}>{type.replace('USER_', '').replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">From</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={dateFrom}
              onChange={(e) => updateUrl({ dateFrom: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">To</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={dateTo}
              onChange={(e) => updateUrl({ dateTo: e.target.value })}
            />
          </div>
        </div>
        {(actionType || dateFrom || dateTo) && (
          <Button variant="ghost" className="h-9" onClick={() => router.push('/admin/activity')}>
            Clear
          </Button>
        )}
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-table-header-bg)] text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-table-border)]">
              <tr>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4 hidden sm:table-cell">Target</th>
                <th className="px-6 py-4 hidden md:table-cell">Time</th>
                <th className="px-6 py-4 hidden lg:table-cell">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-table-border)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-[var(--color-bg-subtle)] rounded w-full" /></td>
                  </tr>
                ))
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Filter className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--color-text-secondary)] font-medium">No activity records found matching filters.</p>
                  </td>
                </tr>
              ) : (
                activities.map((log) => (
                  <tr key={log._id} className="hover:bg-[var(--color-table-row-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <Badge variant="info" className="w-fit text-[10px] font-bold py-0.5">
                          {log.actionType.replace('USER_', '')}
                        </Badge>
                        <p className="text-sm text-[var(--color-text-primary)] font-medium max-w-[280px] line-clamp-2" title={log.details}>
                          {log.details}
                        </p>
                        {/* Mobile fallbacks */}
                        <div className="sm:hidden mt-2 space-y-1">
                          <p className="text-xs text-[var(--color-text-secondary)]"><span className="font-semibold">Target:</span> {log.targetName || 'N/A'}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]"><span className="font-semibold">Time:</span> {new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold uppercase ring-2 ring-white">
                          {log.adminName?.charAt(0) || 'A'}
                        </div>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{log.adminName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] font-medium border border-[var(--color-surface-border)]">
                          {log.targetType}
                        </span>
                        <span className="font-medium text-[var(--color-text-secondary)] truncate max-w-[120px]" title={log.targetName || ''}>
                          {log.targetName || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col text-xs text-[var(--color-text-secondary)]">
                        <span className="font-medium text-[var(--color-text-primary)]">{new Date(log.createdAt).toLocaleDateString()}</span>
                        <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex flex-col gap-1.5 text-[11px] text-[var(--color-text-muted)] font-mono">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3 w-3" /> 
                          {log.ipAddress || 'Internal'}
                        </div>
                        <div className="flex items-center gap-1.5 max-w-[140px] truncate" title={log.userAgent || ''}>
                          <Link2 className="h-3 w-3" /> 
                          {log.userAgent || 'Unknown'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => updateUrl({ page: String(p) })}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
        showItemCount
      />
    </div>
  );
}

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse bg-[var(--color-bg-subtle)] rounded-xl" />}>
      <AdminActivityPageInner />
    </Suspense>
  );
}
