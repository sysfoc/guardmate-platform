'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAdminDisputes, getAdminDisputeStats, resolveDispute } from '@/lib/api/admin.api';
import { Loader2, ShieldAlert, AlertTriangle, CheckCircle, Search, Clock, DollarSign, Activity, ShieldCheck, ChevronLeft, ChevronRight, Filter, XCircle } from 'lucide-react';
import { AdminDecision } from '@/types/enums';
import { cn } from '@/lib/utils';

// API returns populated fields not in base IDispute type
interface PopulatedDispute {
  _id: string;
  jobId: string;
  paymentId: string;
  jobTitle: string;
  bossUid: string;
  guardUid: string;
  bossName: string;
  guardName: string;
  escrowAmount: number;
  currency: string;
  reason: string;
  description: string;
  status: string;
  adminDecision: string | null;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  disputeDeadline: string;
  chargebackRaised: boolean;
  chargebackId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackState {
  message: string;
  type: 'success' | 'error';
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<PopulatedDispute[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Resolution states
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<AdminDecision | ''>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResp, disputesResp] = await Promise.all([
        getAdminDisputeStats(),
        getAdminDisputes({
          page,
          limit: 20,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery || undefined,
        })
      ]);
      if (statsResp.success) setStats(statsResp.data);
      if (disputesResp.success) {
        setDisputes(disputesResp.data.data);
        setTotalPages(disputesResp.data.totalPages);
        setTotal(disputesResp.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-hide feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleResolve = async (disputeId: string) => {
    if (!decision) return setFeedback({ message: 'Select a decision', type: 'error' });
    if (!adminNotes) return setFeedback({ message: 'Admin notes required', type: 'error' });
    if (decision === AdminDecision.PARTIAL && (!amount || amount <= 0)) {
      return setFeedback({ message: 'Enter a valid partial amount', type: 'error' });
    }

    setSubmitLoading(true);
    const resp = await resolveDispute(disputeId, {
      decision,
      adminNotes,
      adminDecisionAmount: decision === AdminDecision.PARTIAL ? amount : undefined
    });

    if (resp.success) {
      setFeedback({ message: 'Dispute resolved successfully.', type: 'success' });
      setResolvingId(null);
      setDecision('');
      setAdminNotes('');
      setAmount(0);
      fetchData();
    } else {
      setFeedback({ message: resp.message || 'Resolution failed', type: 'error' });
    }
    setSubmitLoading(false);
  };

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchInput);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
    setSearchInput('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Feedback Toast */}
      {feedback && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
          feedback.type === 'success' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-danger)] text-white'
        )}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-70">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Dispute Management</h1>
        <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">Mediate and resolve escrow disputes between Bosses and Guards.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          <Card className="p-4 bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
               <Activity className="h-4 w-4 text-[var(--color-info)]" />
               <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Total Disputes</h3>
            </div>
            <p className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)] flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-2">
               <ShieldAlert className="h-4 w-4 text-[var(--color-warning)]" />
               <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Active (Open/Review)</h3>
             </div>
            <p className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">{stats.open + stats.underReview}</p>
          </Card>
          <Card className="p-4 bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)] flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-2">
               <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
               <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Resolved</h3>
             </div>
            <p className="text-2xl font-black text-[var(--color-success)] tabular-nums">{stats.resolved}</p>
          </Card>
          <Card className="p-4 bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)] flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-2">
               <Clock className="h-4 w-4 text-[var(--color-secondary)]" />
               <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Avg Resolution</h3>
             </div>
            <p className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">{stats.averageResolutionHours} hrs</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[var(--color-surface-border)] shadow-sm flex-1 min-w-0">
          <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search by job title..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] min-w-0"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
              <XCircle className="h-4 w-4" />
            </button>
          )}
          <Button size="sm" onClick={handleSearch} className="shrink-0">Search</Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[var(--color-surface-border)] shadow-sm">
            <Filter className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-[var(--color-text-primary)] outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {(statusFilter !== 'ALL' || searchQuery) && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {loading && disputes.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>Showing {disputes.length} of {total} disputes</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <div className="space-y-4">
            {disputes.length === 0 ? (
              <Card className="p-12 text-center bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)]">
                <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
                <p className="font-bold text-[var(--color-text-primary)]">No disputes found</p>
                {(statusFilter !== 'ALL' || searchQuery) && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Try adjusting your filters</p>
                )}
              </Card>
            ) : disputes.map((dispute) => (
          <Card key={dispute._id} className="p-5 bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)] relative overflow-hidden group">
            {dispute.status === 'RESOLVED' ? (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-success)]" />
            ) : (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-warning)]" />
            )}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-[var(--color-text-primary)] truncate text-base">{dispute.jobTitle}</h3>
                  <Badge variant={dispute.status === 'RESOLVED' ? 'success' : 'warning'} className="text-[9px] uppercase font-bold py-0 h-5">
                    {dispute.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  <span className="font-bold text-[var(--color-text-primary)] text-[10px] uppercase tracking-wider mr-2">Reason:</span> 
                  {dispute.reason}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] px-3 py-2 rounded-lg border border-[var(--color-surface-border)] max-w-fit">
                  <span><span className="font-bold text-[var(--color-text-primary)] text-[10px] uppercase tracking-wider">Boss:</span> {dispute.bossName}</span>
                  <span className="text-[var(--color-border-primary)]">•</span>
                  <span><span className="font-bold text-[var(--color-text-primary)] text-[10px] uppercase tracking-wider">Guard:</span> {dispute.guardName}</span>
                  <span className="text-[var(--color-border-primary)]">•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-bold text-[var(--color-text-primary)] text-[10px] uppercase tracking-wider">Escrow:</span> 
                    <span className="text-[var(--color-secondary)] font-bold">${dispute.escrowAmount} {dispute.currency}</span>
                  </span>
                </div>
                
                {dispute.chargebackRaised && (
                  <div className="mt-4 text-xs font-bold bg-[var(--color-danger-light)] text-[var(--color-danger)] p-2.5 rounded-lg border border-[var(--color-danger)]/20 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    CHARGEBACK FILED — Dispute ID: {dispute.chargebackId}
                  </div>
                )}
              </div>
              
              {(dispute.status === 'UNDER_REVIEW' || dispute.status === 'OPEN') && resolvingId !== dispute._id && (
                <Button onClick={() => setResolvingId(dispute._id)} size="sm" variant="outline" className="w-full md:w-auto shrink-0 shadow-sm">
                  Mediate Dispute
                </Button>
              )}
            </div>

            {resolvingId === dispute._id && (
              <div className="mt-5 p-5 border border-[var(--color-surface-border)] rounded-xl bg-[var(--color-bg-subtle)] md:ml-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--color-surface-border)]">
                  <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
                  <h4 className="font-black text-sm text-[var(--color-text-primary)] uppercase tracking-wider">Admin Resolution</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">Decision Outcome</label>
                    <select 
                      className="w-full bg-white border border-[var(--color-surface-border)] rounded-xl p-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                      value={decision}
                      onChange={e => setDecision(e.target.value as AdminDecision)}
                    >
                      <option value="">Select Outcome...</option>
                      <option value={AdminDecision.RELEASE}>Release Funds to Guard (Guard Wins)</option>
                      <option value={AdminDecision.REFUND}>Refund Boss (Boss Wins)</option>
                      <option value={AdminDecision.PARTIAL}>Partial Refund (Split Decision)</option>
                    </select>
                  </div>
                  
                  {decision === AdminDecision.PARTIAL && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">Amount to Release to Guard</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                        <input 
                          type="number"
                          className="w-full bg-white border border-[var(--color-surface-border)] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all font-bold"
                          value={amount}
                          onChange={e => setAmount(Number(e.target.value))}
                          max={dispute.escrowAmount}
                          placeholder={`Max allowed: ${dispute.escrowAmount}`}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">Admin Notes (Emailed to both parties)</label>
                    <textarea 
                      className="w-full bg-white border border-[var(--color-surface-border)] rounded-xl p-3 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all h-24 resize-none"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Explain the reason for this decision. This will be permanently recorded."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setResolvingId(null)} disabled={submitLoading}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleResolve(dispute._id)}
                      disabled={submitLoading || !decision || !adminNotes}
                      loading={submitLoading}
                    >
                      Finalize Decision
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
