'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { getMyBids, withdrawBid } from '@/lib/api/job.api';
import { getMyPendingReviews } from '@/lib/api/review.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { SubmitReviewModal } from '@/components/reviews/SubmitReviewModal';
import { StarRating } from '@/components/ui/StarRating';
import toast from 'react-hot-toast';
import type { BidWithJob } from '@/types/job.types';
import type { PendingReview } from '@/types/review.types';
import { BidStatus, JobStatus } from '@/types/enums';
import {
  Inbox, Loader2, Clock, CheckCircle2, XCircle,
  MinusCircle, PoundSterling, Calendar, MapPin, ExternalLink, AlertTriangle,
} from 'lucide-react';

const TABS = [
  { key: '', label: 'All Bids' },
  { key: BidStatus.PENDING, label: 'Pending' },
  { key: BidStatus.ACCEPTED, label: 'Accepted' },
  { key: BidStatus.REJECTED, label: 'Rejected' },
  { key: BidStatus.WITHDRAWN, label: 'Withdrawn' },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  [BidStatus.PENDING]: <Clock className="h-3.5 w-3.5 text-[var(--color-warning)]" />,
  [BidStatus.ACCEPTED]: <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" />,
  [BidStatus.REJECTED]: <XCircle className="h-3.5 w-3.5 text-[var(--color-danger)]" />,
  [BidStatus.WITHDRAWN]: <MinusCircle className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />,
};

const STATUS_MESSAGE: Record<string, string> = {
  [BidStatus.PENDING]: 'Awaiting boss decision',
  [BidStatus.ACCEPTED]: 'You have been hired — prepare for your shift',
  [BidStatus.REJECTED]: 'Not selected for this job',
  [BidStatus.WITHDRAWN]: 'You withdrew this application',
};

export default function MateBidsPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  // Free withdraw dialog (PENDING)
  const [confirmWithdraw, setConfirmWithdraw] = useState<{ bidId: string; jobId: string } | null>(null);
  // Strong warning modal (ACCEPTED+FILLED)
  const [confirmHiredWithdraw, setConfirmHiredWithdraw] = useState<{ bidId: string; jobId: string } | null>(null);

  // Review states
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [reviewingJob, setReviewingJob] = useState<PendingReview | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, {rating: number, comment: string}>>({});

  const tab = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const [resp, pendingResp] = await Promise.all([
          getMyBids({ status: tab || undefined, page, limit: 12 }),
          getMyPendingReviews()
        ]);
        
        if (resp.success && resp.data) {
          setBids(resp.data.data as BidWithJob[]);
          setTotal(resp.data.total);
          setTotalPages(resp.data.totalPages);
        }
        if (pendingResp.success && pendingResp.data) {
          setPendingReviews(pendingResp.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user, tab, page]);

  const setTab = (status: string) => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    p.set('page', '1');
    router.push(`/dashboard/mate/bids?${p.toString()}`);
  };

  const setPage = (pg: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(pg));
    router.push(`/dashboard/mate/bids?${p.toString()}`);
  };

  const handleWithdraw = async (bidId: string, jobId: string) => {
    setWithdrawing(bidId);
    try {
      const resp = await withdrawBid(jobId, bidId);
      if (resp.success) {
        toast.success(resp.message || 'Bid withdrawn.');
        setBids((prev) => prev.map((b) =>
          b.bidId === bidId ? { ...b, status: BidStatus.WITHDRAWN, withdrawnAt: new Date().toISOString() } : b
        ));
      } else {
        toast.error(resp.message || 'Failed to withdraw bid');
      }
    } catch { toast.error('Failed to withdraw bid'); }
    finally { setWithdrawing(null); setConfirmWithdraw(null); setConfirmHiredWithdraw(null); }
  };

  if (userLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">My Bids</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{total} total applications</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : bids.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <h3 className="font-bold text-sm mb-1">No bids found</h3>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
              {tab ? 'No bids with this status.' : "You haven't applied to any jobs yet."}
            </p>
            <Link href="/dashboard/mate/jobs">
              <Button size="sm">Browse Jobs</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => {
              const jobStatus = bid.job?.status as JobStatus | undefined;
              const isCompleted = jobStatus === JobStatus.COMPLETED;
              const isAcceptedFilled = bid.status === BidStatus.ACCEPTED && jobStatus === JobStatus.FILLED;
              const isAcceptedInProgress = bid.status === BidStatus.ACCEPTED && jobStatus === JobStatus.IN_PROGRESS;
              const isAcceptedCompleted = bid.status === BidStatus.ACCEPTED && isCompleted;

              const pendingReview = pendingReviews.find(pr => pr.jobId === bid.jobId);
              const submittedReview = submittedReviews[bid.jobId];

              return (
                <Card key={bid.bidId} className={`p-4 hover:border-[var(--color-card-hover-border)] transition-all ${
                  bid.status === BidStatus.ACCEPTED ? 'border-[var(--color-success)]/30 bg-[var(--color-success-light)]/20' : ''
                }`}>
                  <div className="flex items-start gap-4">
                    {bid.job && (
                      <Avatar src={bid.job.companyLogo ?? undefined} name={bid.job.companyName || ''} size="md" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/mate/jobs/${bid.jobId}`} className="font-bold text-sm text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate">
                          {bid.jobTitle}
                        </Link>
                        <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border">
                          {STATUS_ICON[bid.status]} {bid.status}
                        </span>
                      </div>

                      {bid.job && (
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-text-tertiary)] font-medium">
                          <span>{bid.job.companyName}</span>
                          <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{bid.job.locationCity}</span>
                          {bid.job.status && <JobStatusBadge status={bid.job.status} />}
                        </div>
                      )}

                      {/* Status message */}
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 italic">
                        {STATUS_MESSAGE[bid.status] || bid.status}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-[10px] font-medium text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1">
                          <PoundSterling className="h-3 w-3 text-[var(--color-text-muted)]" />
                          <strong>£{bid.proposedRate}</strong>/{bid.budgetType === 'HOURLY' ? 'hr' : 'fixed'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[var(--color-text-muted)]" />
                          Applied {new Date(bid.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        {/* Countdown for accepted + filled */}
                        {isAcceptedFilled && bid.job && (
                          <CountdownTimer targetDate={bid.job.startDate} label="Shift in" variant="compact" />
                        )}
                      </div>

                      {bid.rejectionReason && bid.status === BidStatus.REJECTED && (
                        <p className="mt-2 text-[10px] text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-lg px-3 py-1.5">Reason: {bid.rejectionReason}</p>
                      )}

                      {/* In-progress message */}
                      {isAcceptedInProgress && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--color-success)] bg-[var(--color-success-light)] rounded-lg px-3 py-1.5 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Shift in progress — contact support if you have an issue.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* PENDING: Free withdraw */}
                      {bid.status === BidStatus.PENDING && (
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 border border-[var(--color-surface-border)]"
                          onClick={() => setConfirmWithdraw({ bidId: bid.bidId, jobId: bid.jobId })}>
                          Withdraw Application
                        </Button>
                      )}

                      {/* ACCEPTED + FILLED: Withdraw with warning */}
                      {isAcceptedFilled && (
                        <Button variant="danger" size="sm" className="text-[10px] h-7"
                          onClick={() => setConfirmHiredWithdraw({ bidId: bid.bidId, jobId: bid.jobId })}>
                          Withdraw from Job
                        </Button>
                      )}

                      {/* COMPLETED: Leave Review or Show Reviewed */}
                      {isAcceptedCompleted && pendingReview && !submittedReview && (
                        <Button variant="primary" size="sm" className="text-[10px] h-7 shadow-md"
                          onClick={() => setReviewingJob(pendingReview)}>
                          Leave a Review
                        </Button>
                      )}
                      
                      {isAcceptedCompleted && (!pendingReview || submittedReview) && (
                        <Badge variant="success" className="h-7 text-[10px] gap-1 px-2.5">
                          <CheckCircle2 className="h-3 w-3" /> Reviewed
                        </Badge>
                      )}

                      <Link href={`/dashboard/mate/jobs/${bid.jobId}`}>
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 border border-[var(--color-surface-border)]">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={12} showItemCount onPageChange={setPage} />
      </div>

      {/* PENDING withdraw confirm */}
      <ConfirmDialog
        isOpen={!!confirmWithdraw}
        onCancel={() => setConfirmWithdraw(null)}
        onConfirm={() => confirmWithdraw && handleWithdraw(confirmWithdraw.bidId, confirmWithdraw.jobId)}
        title="Withdraw this application?"
        message="You will no longer be considered for this job. You can re-apply later if the job is still open."
        confirmLabel={withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
        variant="danger"
      />

      {/* ACCEPTED+FILLED withdraw warning modal */}
      <Modal
        isOpen={!!confirmHiredWithdraw}
        onClose={() => setConfirmHiredWithdraw(null)}
        title="Withdraw from hired job?"
      >
        <div className="space-y-4">
          <div className="bg-[var(--color-danger-light)] text-[var(--color-danger)] p-3 rounded-lg text-xs font-medium flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Warning: Withdrawing after being hired will negatively impact your reliability score and may affect future job applications.</p>
              <p className="mt-1 opacity-80">A cancellation strike will be added to your profile. Are you absolutely sure?</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirmHiredWithdraw(null)}>
              Keep My Commitment
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => confirmHiredWithdraw && handleWithdraw(confirmHiredWithdraw.bidId, confirmHiredWithdraw.jobId)}
              disabled={!!withdrawing}
              className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90"
            >
              {withdrawing ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Withdrawing...</> : 'Yes, Withdraw'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      {reviewingJob && (
        <SubmitReviewModal
          isOpen={!!reviewingJob}
          onClose={() => setReviewingJob(null)}
          onSuccess={(rating: number, comment: string) => {
            setSubmittedReviews(prev => ({ ...prev, [reviewingJob.jobId]: { rating, comment } }));
            setPendingReviews(prev => prev.filter(pr => pr.jobId !== reviewingJob.jobId));
            setReviewingJob(null);
          }}
          jobId={reviewingJob.jobId}
          jobTitle={reviewingJob.jobTitle}
          receiverName={reviewingJob.receiverName}
          receiverRole={reviewingJob.receiverRole}
          receiverPhoto={reviewingJob.receiverPhoto}
        />
      )}
    </div>
  );
}
