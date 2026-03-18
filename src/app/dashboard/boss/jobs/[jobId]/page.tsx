'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { getJobById, cancelJob, completeJob } from '@/lib/api/job.api';
import { getMyPendingReviews } from '@/lib/api/review.api';
import { JobDetailView } from '@/components/jobs/JobDetailView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { SubmitReviewModal } from '@/components/reviews/SubmitReviewModal';
import { StarRating } from '@/components/ui/StarRating';
import { Avatar } from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import type { IJob } from '@/types/job.types';
import type { PendingReview } from '@/types/review.types';
import { JobStatus } from '@/types/enums';
import { Edit, Trash2, Users, ChevronLeft, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function BossJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);

  // Complete dialog
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Review states
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<{ rating: number; comment: string } | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const resp = await getJobById(jobId);
        if (resp.success && resp.data) {
          setJob(resp.data);
          if (resp.data.status === JobStatus.COMPLETED) {
            const pendingResp = await getMyPendingReviews();
            if (pendingResp.success && pendingResp.data) {
              const pending = pendingResp.data.find(pr => pr.jobId === resp.data!.jobId);
              if (pending) setPendingReview(pending);
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load job');
      } finally { setLoading(false); }
    };
    fetch();
  }, [jobId]);

  const handleComplete = async () => {
    if (!job) return;
    setCompleting(true);
    try {
      const resp = await completeJob(job.jobId);
      if (resp.success && resp.data) {
        toast.success('Job marked as completed! Payment will be released to the guard.');
        setJob(resp.data);
        
        // After completing, verify if they now have a pending review for it!
        const pendingResp = await getMyPendingReviews();
        if (pendingResp.success && pendingResp.data) {
          const pending = pendingResp.data.find(pr => pr.jobId === resp.data!.jobId);
          if (pending) setPendingReview(pending);
        }
      } else {
        toast.error(resp.message || 'Failed to complete job');
      }
    } catch { toast.error('Failed to complete job'); }
    finally { setCompleting(false); setShowComplete(false); }
  };

  const handleCancel = async () => {
    if (!job || cancelReason.trim().length < 20) {
      toast.error('Cancel reason must be at least 20 characters.');
      return;
    }
    setCancelling(true);
    try {
      const resp = await cancelJob(job.jobId, cancelReason.trim());
      if (resp.success) {
        toast.success(resp.message || 'Job cancelled');
        router.push('/dashboard/boss/jobs');
      } else {
        toast.error(resp.message || 'Failed to cancel job');
      }
    } catch { toast.error('Failed to cancel job'); }
    finally { setCancelling(false); setShowCancel(false); setCancelReason(''); }
  };

  if (userLoading || loading) return <DashboardSkeleton />;
  if (!job) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <p className="text-sm text-[var(--color-text-secondary)]">Job not found.</p>
      <Link href="/dashboard/boss/jobs"><Button variant="ghost" size="sm" className="mt-4">Back to Jobs</Button></Link>
    </div>
  );

  const canEdit = job.status === JobStatus.DRAFT || job.status === JobStatus.OPEN;
  const canCancel = job.status === JobStatus.OPEN || job.status === JobStatus.DRAFT || job.status === JobStatus.FILLED;
  const canComplete = job.status === JobStatus.IN_PROGRESS;

  const cancelWarning = job.status === JobStatus.FILLED
    ? 'Warning: A guard has already been hired for this job. Cancelling will affect your reliability score.'
    : 'This action cannot be undone. All pending bids will be notified.';

  // Timeline stages
  const stages = [
    { label: 'Posted', active: true },
    { label: 'Hired', active: [JobStatus.FILLED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED].includes(job.status as JobStatus) },
    { label: 'In Progress', active: [JobStatus.IN_PROGRESS, JobStatus.COMPLETED].includes(job.status as JobStatus) },
    { label: 'Completed', active: job.status === JobStatus.COMPLETED },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push('/dashboard/boss/jobs')} className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] mb-4 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to My Jobs
        </button>

        {/* Timeline indicator */}
        {job.status !== JobStatus.CANCELLED && job.status !== JobStatus.EXPIRED && (
          <div className="flex items-center gap-0 mb-6 overflow-x-auto">
            {stages.map((stage, i) => (
              <React.Fragment key={stage.label}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                  stage.active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
                }`}>
                  {stage.active ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {stage.label}
                </div>
                {i < stages.length - 1 && (
                  <div className={`h-0.5 w-6 sm:w-10 shrink-0 ${stage.active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-border)]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Countdown timers */}
        <div className="flex items-center gap-4 mb-4">
          {job.status === JobStatus.FILLED && (
            <CountdownTimer targetDate={job.startDate} label="Shift starts in" />
          )}
          {job.status === JobStatus.OPEN && (
            <CountdownTimer targetDate={job.applicationDeadline} label="Deadline in" />
          )}
        </div>

        <JobDetailView
          job={job}
          actions={
            <>
              <Link href={`/dashboard/boss/jobs/${job.jobId}/bids`}>
                <Button size="sm" variant="ghost" leftIcon={<Users className="h-4 w-4" />} className="border border-[var(--color-surface-border)]">
                  View Bids ({job.totalBids})
                </Button>
              </Link>
              {canEdit && (
                <Button size="sm" variant="ghost" leftIcon={<Edit className="h-4 w-4" />} className="border border-[var(--color-surface-border)]"
                  onClick={() => router.push(`/dashboard/boss/jobs/${job.jobId}/edit`)}>
                  Edit
                </Button>
              )}
              {canComplete && (
                <Button size="sm" variant="primary" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setShowComplete(true)}>
                  Mark as Complete
                </Button>
              )}
              {canCancel && (
                <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setShowCancel(true)}>
                  Cancel Job
                </Button>
              )}
            </>
          }
        >
          {/* Bids or Review CTA in sidebar */}
          {job.status === JobStatus.COMPLETED ? (
            <Card className="p-5 flex flex-col items-center text-center">
              {submittedReview ? (
                <>
                  <div className="bg-[var(--color-success-light)] p-3 rounded-full mb-3">
                    <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
                  </div>
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">Review Submitted</h3>
                  <div className="flex justify-center mb-2">
                    <StarRating rating={submittedReview.rating} size="md" />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] italic line-clamp-3">"{submittedReview.comment}"</p>
                </>
              ) : pendingReview ? (
                <>
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-3">Rate your Guard</h3>
                  <Avatar src={pendingReview.receiverPhoto || undefined} name={pendingReview.receiverName} size="xl" className="mb-2 shadow-md" />
                  <p className="font-bold text-sm text-[var(--color-text-primary)] mb-1">{pendingReview.receiverName}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] mb-4 px-2">How was your experience working with {pendingReview.receiverName.split(' ')[0]}?</p>
                  <Button size="sm" className="w-full shadow-md" onClick={() => setShowReviewModal(true)}>
                    Leave a Review
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-[var(--color-bg-subtle)] p-3 rounded-full mb-3">
                    <CheckCircle2 className="h-6 w-6 text-[var(--color-text-muted)]" />
                  </div>
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">Job Completed</h3>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">This job has been finalised and reviewed.</p>
                </>
              )}
            </Card>
          ) : (
            <Card className="p-5 bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 text-white border-none">
              <h3 className="font-bold text-sm mb-1">Bids Received</h3>
              <p className="text-3xl font-black">{job.totalBids}</p>
              <Link href={`/dashboard/boss/jobs/${job.jobId}/bids`}>
                <Button variant="secondary" size="sm" className="w-full mt-3 bg-white text-black hover:bg-white/90 font-bold">
                  Review All Bids
                </Button>
              </Link>
            </Card>
          )}
        </JobDetailView>
      </div>

      {/* Completion confirmation dialog */}
      <ConfirmDialog
        isOpen={showComplete}
        onCancel={() => setShowComplete(false)}
        onConfirm={handleComplete}
        title="Mark this job as complete?"
        message="Are you sure you want to mark this job as complete? This will release payment to the guard."
        confirmLabel={completing ? 'Completing...' : 'Yes, Mark Complete'}
        variant="warning"
      />

      {/* Cancel modal with reason */}
      <Modal isOpen={showCancel} onClose={() => { setShowCancel(false); setCancelReason(''); }} title="Cancel this job?">
        <div className="space-y-4">
          <div className={`p-3 rounded-lg text-xs font-medium ${
            job.status === JobStatus.FILLED
              ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
              : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
          }`}>
            {cancelWarning}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">
              Cancel Reason <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please explain why you are cancelling this job (minimum 20 characters)..."
              rows={4}
              className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] resize-none"
            />
            <p className={`text-[10px] mt-1 font-medium ${
              cancelReason.trim().length >= 20
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-text-muted)]'
            }`}>
              {cancelReason.trim().length}/20 characters minimum
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowCancel(false); setCancelReason(''); }}>
              Keep Job
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling || cancelReason.trim().length < 20}
            >
              {cancelling ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Cancelling...</> : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      {pendingReview && showReviewModal && (
        <SubmitReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={(rating: number, comment: string) => {
            setSubmittedReview({ rating, comment });
            setPendingReview(null);
          }}
          jobId={job.jobId}
          jobTitle={job.title}
          receiverName={pendingReview.receiverName}
          receiverRole={pendingReview.receiverRole}
          receiverPhoto={pendingReview.receiverPhoto}
        />
      )}
    </div>
  );
}
