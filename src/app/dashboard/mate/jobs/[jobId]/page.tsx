'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { getJobById, submitBid } from '@/lib/api/job.api';
import { JobDetailView } from '@/components/jobs/JobDetailView';
import { BidSubmissionModal } from '@/components/jobs/BidSubmissionModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import toast from 'react-hot-toast';
import type { IJob, SubmitBidPayload } from '@/types/job.types';
import { JobStatus, UserStatus, LicenseStatus } from '@/types/enums';
import { ChevronLeft, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function MateJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBidModal, setShowBidModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const resp = await getJobById(jobId);
        if (resp.success && resp.data) setJob(resp.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load job');
      } finally { setLoading(false); }
    };
    fetch();
  }, [jobId]);

  const isGuardReady = user?.status === UserStatus.ACTIVE && user !== null && 'licenseStatus' in user && user.licenseStatus === LicenseStatus.VALID;

  const handleSubmitBid = async (payload: SubmitBidPayload) => {
    if (!jobId) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const resp = await submitBid(jobId, payload);
      if (resp.success) {
        toast.success('Application submitted successfully!');
        setHasApplied(true);
        setShowBidModal(false);
        // Refresh job to update bid count
        const refreshed = await getJobById(jobId);
        if (refreshed.success && refreshed.data) setJob(refreshed.data);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to submit bid';
      if (msg.includes('already submitted')) {
        setHasApplied(true);
      }
      setApiError(msg);
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  if (userLoading || loading) return <DashboardSkeleton />;
  if (!job) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <p className="text-sm text-[var(--color-text-secondary)]">Job not found.</p>
      <Link href="/dashboard/mate/jobs"><Button variant="ghost" size="sm" className="mt-4">Back to Jobs</Button></Link>
    </div>
  );

  const canApply = isGuardReady && job.status === JobStatus.OPEN && !hasApplied;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push('/dashboard/mate/jobs')} className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] mb-4 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Marketplace
        </button>

        <JobDetailView job={job}>
          {/* Apply section in sidebar */}
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-3">Apply for this Job</h3>
            {hasApplied ? (
              <div className="flex items-center gap-2 p-3 bg-[var(--color-success-light)] rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                <div>
                  <p className="text-xs font-bold text-[var(--color-success)]">Already Applied</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Check your bids for status updates.</p>
                </div>
              </div>
            ) : !isGuardReady ? (
              <Tooltip content={!user?.status || user.status !== UserStatus.ACTIVE ? 'Your account must be ACTIVE' : 'Your SIA license must be VALID'}>
                <div className="w-full">
                  <Button size="sm" disabled className="w-full" leftIcon={<AlertCircle className="h-4 w-4" />}>
                    Cannot Apply
                  </Button>
                  <p className="text-[9px] text-[var(--color-text-muted)] text-center mt-1.5">
                    {user?.status !== UserStatus.ACTIVE ? 'Account not active' : 'License not valid'}
                  </p>
                </div>
              </Tooltip>
            ) : job.status !== JobStatus.OPEN ? (
              <Badge className="w-full justify-center py-2">Job is no longer accepting applications</Badge>
            ) : (
              <Button size="sm" className="w-full shadow-md shadow-[var(--color-primary)]/10" leftIcon={<Send className="h-4 w-4" />} onClick={() => setShowBidModal(true)}>
                Apply Now
              </Button>
            )}
            <Link href="/dashboard/mate/bids" className="block text-center text-[10px] font-bold text-[var(--color-primary)] mt-3 hover:underline">
              View My Bids →
            </Link>
          </Card>
        </JobDetailView>
      </div>

      {/* Bid Submission Modal */}
      {job && showBidModal && (
        <BidSubmissionModal
          isOpen={showBidModal}
          onClose={() => setShowBidModal(false)}
          onSubmit={handleSubmitBid}
          job={job}
          isSubmitting={submitting}
          apiError={apiError}
        />
      )}
    </div>
  );
}
