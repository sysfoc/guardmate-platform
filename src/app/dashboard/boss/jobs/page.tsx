'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { getMyJobs } from '@/lib/api/job.api';
import { JobCard } from '@/components/jobs/JobCard';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Card } from '@/components/ui/Card';
import type { IJob } from '@/types/job.types';
import { JobStatus } from '@/types/enums';
import { Plus, Briefcase, Loader2 } from 'lucide-react';

const TABS = [
  { key: '', label: 'All' },
  { key: JobStatus.OPEN, label: 'Open' },
  { key: JobStatus.FILLED, label: 'Filled' },
  { key: JobStatus.IN_PROGRESS, label: 'In Progress' },
  { key: JobStatus.COMPLETED, label: 'Completed' },
  { key: JobStatus.CANCELLED, label: 'Cancelled' },
];

function BossJobsContent() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<IJob[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const currentTab = searchParams.get('status') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const resp = await getMyJobs({ status: currentTab || undefined, page: currentPage, limit: 12 });
        if (resp.success && resp.data) {
          setJobs(resp.data.data);
          setTotal(resp.data.total);
          setTotalPages(resp.data.totalPages);
          if (resp.data.statusCounts) setStatusCounts(resp.data.statusCounts);
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user, currentTab, currentPage]);

  const setTab = (status: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', '1');
    router.push(`/dashboard/boss/jobs?${params.toString()}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/boss/jobs?${params.toString()}`);
  };

  if (userLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">My Jobs</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{total} total jobs</p>
          </div>
          <Link href="/dashboard/boss/jobs/new">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="shadow-md shadow-[var(--color-primary)]/10">Post New Job</Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                currentTab === tab.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}>
              {tab.label}
              {tab.key && statusCounts[tab.key] !== undefined && (
                <span className="ml-1.5 text-[8px] opacity-70">({statusCounts[tab.key]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Jobs */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">No jobs found</h3>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
              {currentTab ? 'No jobs match this status filter.' : "You haven't posted any jobs yet."}
            </p>
            <Link href="/dashboard/boss/jobs/new">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>Post Your First Job</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.jobId}
                job={job}
                showActions
                linkPrefix="/dashboard/boss/jobs"
              />
            ))}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={12}
          showItemCount
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

export default function BossJobsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BossJobsContent />
    </Suspense>
  );
}

