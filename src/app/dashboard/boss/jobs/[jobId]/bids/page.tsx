'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { getJobBids, acceptBid, rejectBid } from '@/lib/api/job.api';
import { createOrGetConversation } from '@/lib/api/chat.api';
import { BidCard } from '@/components/jobs/BidCard';
import { BidComparisonModal } from '@/components/jobs/BidComparisonModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import type { IBid, IJob } from '@/types/job.types';
import { BidStatus, HiringStatus } from '@/types/enums';
import { ChevronLeft, Users, Loader2, Inbox } from 'lucide-react';

export default function BossJobBidsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { isLoading: userLoading } = useUser();
  const [bids, setBids] = useState<IBid[]>([]);
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);

  const [confirmAccept, setConfirmAccept] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [messagingGuard, setMessagingGuard] = useState<string | null>(null);

  // Comparison State
  const [selectedBids, setSelectedBids] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const resp = await getJobBids(jobId);
        if (resp.success && resp.data) {
          setBids(resp.data.bids);
          setJob(resp.data.job);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [jobId]);

  const handleAccept = async () => {
    if (!confirmAccept || !jobId) return;
    setAccepting(true);
    try {
      const resp = await acceptBid(jobId, confirmAccept);
      if (resp.success) {
        toast.success('Bid accepted! Guard has been notified.');
        // Refresh bids
        const refreshed = await getJobBids(jobId);
        if (refreshed.success && refreshed.data) {
          setBids(refreshed.data.bids);
          setJob(refreshed.data.job);
        }
      }
    } catch { toast.error('Failed to accept bid'); }
    finally { setAccepting(false); setConfirmAccept(null); }
  };

  const handleReject = async () => {
    if (!showRejectModal || !jobId) return;
    setRejecting(true);
    try {
      const resp = await rejectBid(jobId, showRejectModal, rejectReason || undefined);
      if (resp.success) {
        toast.success('Bid rejected.');
        setBids((prev) => prev.map((b) =>
          b.bidId === showRejectModal ? { ...b, status: BidStatus.REJECTED, rejectedAt: new Date().toISOString(), rejectionReason: rejectReason || null } : b
        ));
      }
    } catch { toast.error('Failed to reject bid'); }
    finally { setRejecting(false); setShowRejectModal(null); setRejectReason(''); }
  };

  const handleMessageGuard = async (bidId: string, guardId: string) => {
    if (!jobId) return;
    setMessagingGuard(guardId);
    try {
      const resp = await createOrGetConversation(jobId, guardId);
      if (resp.success && resp.data) {
        router.push(`/dashboard/boss/messages?conversation=${resp.data._id}`);
      } else {
        toast.error('Failed to start chat.');
      }
    } catch {
      toast.error('Error starting conversation.');
    } finally {
      setMessagingGuard(null);
    }
  };

  const handleSelectForCompare = (bidId: string, checked: boolean) => {
    setSelectedBids(prev => {
      if (checked) {
        if (prev.length < 4) return [...prev, bidId];
        return prev;
      }
      return prev.filter(id => id !== bidId);
    });
  };

  if (userLoading || loading) return <DashboardSkeleton />;

  const acceptedBids = bids.filter((b) => b.status === BidStatus.ACCEPTED);
  const pendingBids = bids.filter((b) => b.status === BidStatus.PENDING);
  const otherBids = bids.filter((b) => b.status !== BidStatus.PENDING && b.status !== BidStatus.ACCEPTED);
  const isFullyHired = job?.hiringStatus === HiringStatus.FULLY_HIRED;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button onClick={() => router.push(`/dashboard/boss/jobs/${jobId}`)} className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Job Detail
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">
              Bids {job && <span className="text-[var(--color-text-muted)]">for {job.title}</span>}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {bids.length} total bids • {pendingBids.length} pending
            </p>
          </div>
        </div>

        {bids.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <h3 className="font-bold text-sm mb-1">No bids yet</h3>
            <p className="text-xs text-[var(--color-text-tertiary)]">Guards haven&apos;t submitted bids for this job yet.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Accepted Bids */}
            {acceptedBids.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-[var(--color-success)] uppercase tracking-wider mb-2">✓ Accepted Bids ({acceptedBids.length}/{job?.numberOfGuardsNeeded})</h2>
                <div className="space-y-3">
                  {acceptedBids.map((bid) => (
                    <BidCard 
                      key={bid.bidId}
                      bid={bid} 
                      onMessage={(bidId, guardId) => handleMessageGuard(bidId, guardId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Bids */}
            {pendingBids.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Pending ({pendingBids.length})</h2>
                <div className="space-y-3">
                  {pendingBids.map((bid) => (
                    <BidCard
                      key={bid.bidId}
                      bid={bid}
                      showActions={!isFullyHired}
                      onAccept={(id) => setConfirmAccept(id)}
                      onReject={(id) => setShowRejectModal(id)}
                      onSelectForCompare={handleSelectForCompare}
                      isSelectedForCompare={selectedBids.includes(bid.bidId)}
                      isCompareSelectable={selectedBids.length < 4}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Bids */}
            {otherBids.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Other ({otherBids.length})</h2>
                <div className="space-y-3">
                  {otherBids.map((bid) => <BidCard key={bid.bidId} bid={bid} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accept Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmAccept}
        onCancel={() => setConfirmAccept(null)}
        onConfirm={handleAccept}
        title="Accept this bid?"
        message={
          job?.numberOfGuardsNeeded && acceptedBids.length + 1 >= job.numberOfGuardsNeeded
            ? "Accepting this bid will fill the final slot, automatically rejecting all other pending bids and marking the job as FILLED. This action cannot be undone."
            : `Accepting this bid will add this guard to your hired list. You still need to hire ${job?.numberOfGuardsNeeded ? job.numberOfGuardsNeeded - (acceptedBids.length + 1) : 0} more guards.`
        }
        confirmLabel={accepting ? 'Accepting...' : 'Accept Bid'}
      />

      {/* Reject Modal */}
      <Modal isOpen={!!showRejectModal} onClose={() => { setShowRejectModal(null); setRejectReason(''); }} title="Reject Bid" size="sm">
        <div className="space-y-4 p-1">
          <p className="text-xs text-[var(--color-text-secondary)]">Optionally provide a reason for rejection:</p>
          <textarea
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason (optional)"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none resize-none"
          />
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="flex-1">Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReject} disabled={rejecting} className="flex-1">{rejecting ? 'Rejecting...' : 'Reject Bid'}</Button>
          </div>
        </div>
      </Modal>
      {/* Sticky Compare Button */}
      {selectedBids.length >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-200 dark:bg-gray-800 border-t border-[var(--color-border-primary)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 flex justify-between items-center z-40 transition-transform animate-in slide-in-from-bottom-5">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center justify-between px-4 sm:px-6">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              <span className="bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full mr-2">{selectedBids.length} / 4</span>
              Bids selected to compare
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedBids([])} className="font-bold">Clear All</Button>
              <Button variant="primary" size="sm" onClick={() => setShowCompare(true)} className="font-bold shadow-md">
                Compare {selectedBids.length} Bids
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {job && (
        <BidComparisonModal
          isOpen={showCompare}
          onClose={() => setShowCompare(false)}
          bids={bids.filter(b => selectedBids.includes(b.bidId))}
          job={job}
          onAccept={(id) => { setShowCompare(false); setConfirmAccept(id); }}
          onReject={(id) => { setShowCompare(false); setShowRejectModal(id); }}
          isAccepting={accepting}
        />
      )}
    </div>
  );
}
