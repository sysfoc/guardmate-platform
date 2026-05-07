'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAdminDisputes, getAdminDisputeStats, resolveDispute } from '@/lib/api/admin.api';
import { Loader2, ShieldAlert, AlertTriangle, CheckCircle, Search, Clock, DollarSign, Activity, ShieldCheck } from 'lucide-react';
import type { IDispute } from '@/types/dispute.types';
import { AdminDecision } from '@/types/enums';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<IDispute[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Resolution states
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<AdminDecision | ''>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResp, disputesResp] = await Promise.all([
        getAdminDisputeStats(),
        getAdminDisputes()
      ]);
      if (statsResp.success) setStats(statsResp.data);
      if (disputesResp.success) setDisputes(disputesResp.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async (disputeId: string) => {
    if (!decision) return alert('Select a decision');
    if (!adminNotes) return alert('Admin notes required');
    
    setSubmitLoading(true);
    try {
      await resolveDispute(disputeId, {
        decision,
        adminNotes,
        adminDecisionAmount: decision === AdminDecision.PARTIAL ? amount : undefined
      });
      setResolvingId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Resolution failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
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

      <div className="space-y-4">
        {disputes.length === 0 ? (
           <Card className="p-12 text-center bg-white border-none shadow-sm ring-1 ring-[var(--color-surface-border)]">
             <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
             <p className="font-bold text-[var(--color-text-primary)]">No disputes found</p>
           </Card>
        ) : disputes.map((dispute: any) => (
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
    </div>
  );
}
