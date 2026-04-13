'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAdminDisputes, getAdminDisputeStats, resolveDispute } from '@/lib/api/admin.api';
import { Loader2, ShieldAlert, AlertTriangle, CheckCircle, Search, Clock } from 'lucide-react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Dispute Management</h1>
        <p className="text-sm text-white/60">Mediate and resolve escrow disputes between Bosses and Guards.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-surface-border)] shadow-md">
            <h3 className="text-xs font-bold text-white/60 uppercase">Total Disputes</h3>
            <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-surface-border)] shadow-md">
            <h3 className="text-xs font-bold text-white/60 uppercase">Active (Open/Review)</h3>
            <p className="text-2xl font-black text-white mt-1">{stats.open + stats.underReview}</p>
          </Card>
          <Card className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-surface-border)] shadow-md">
            <h3 className="text-xs font-bold text-white/60 uppercase">Resolved</h3>
            <p className="text-2xl font-black text-[var(--color-success)] mt-1">{stats.resolved}</p>
          </Card>
          <Card className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-surface-border)] shadow-md">
            <h3 className="text-xs font-bold text-white/60 uppercase">Avg Resolution</h3>
            <p className="text-2xl font-black text-white mt-1">{stats.averageResolutionHours} hrs</p>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {disputes.length === 0 ? (
           <Card className="p-12 text-center text-white/60">
             <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" />
             <p className="font-bold">No disputes found</p>
           </Card>
        ) : disputes.map((dispute: any) => (
          <Card key={dispute._id} className="p-5 border-l-4 border-l-[var(--color-warning)]">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-white">{dispute.jobTitle}</h3>
                  <Badge variant={dispute.status === 'RESOLVED' ? 'success' : 'warning'}>{dispute.status}</Badge>
                </div>
                <p className="text-sm text-white/70 mb-1"><span className="font-bold text-white">Reason:</span> {dispute.reason}</p>
                <div className="flex items-center gap-4 text-xs text-white/60 mb-4 bg-white/5 p-2 rounded w-max border border-white/10">
                  <span><span className="font-bold">Boss:</span> {dispute.bossName}</span>
                  <span>|</span>
                  <span><span className="font-bold">Guard:</span> {dispute.guardName}</span>
                  <span>|</span>
                  <span><span className="font-bold">Escrow:</span> {dispute.escrowAmount} {dispute.currency}</span>
                </div>
                
                {dispute.chargebackRaised && (
                  <div className="mb-4 text-xs font-bold bg-red-500/20 text-red-400 p-2 rounded-md border border-red-500/30">
                    CHARGEBACK FILED — Dispute ID: {dispute.chargebackId}
                  </div>
                )}
              </div>
              
              {(dispute.status === 'UNDER_REVIEW' || dispute.status === 'OPEN') && resolvingId !== dispute._id && (
                <Button onClick={() => setResolvingId(dispute._id)} size="sm">Mediate</Button>
              )}
            </div>

            {resolvingId === dispute._id && (
              <div className="mt-4 p-4 border border-white/20 rounded-xl bg-black/20">
                <h4 className="font-bold text-sm mb-3">Admin Resolution</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Decision</label>
                    <select 
                      className="w-full bg-white/5 border border-white/20 rounded p-2 text-sm text-white outline-none"
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
                    <div>
                      <label className="block text-xs font-bold mb-1">Amount to Release to Guard</label>
                      <input 
                        type="number"
                        className="w-full bg-white/5 border border-white/20 rounded p-2 text-sm text-white outline-none"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        max={dispute.escrowAmount}
                        placeholder={`Max: ${dispute.escrowAmount}`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold mb-1">Admin Notes (Emailed to both parties)</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/20 rounded p-2 text-sm text-white outline-none h-20"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Explain the reason for this decision..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setResolvingId(null)}>Cancel</Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleResolve(dispute._id)}
                      disabled={submitLoading || !decision || !adminNotes}
                    >
                      {submitLoading ? 'Executing...' : 'Finalize Decision'}
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
