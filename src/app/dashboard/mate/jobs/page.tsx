'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { getJobs, getMyBids } from '@/lib/api/job.api';
import { checkDateOverlap } from '@/lib/jobs/overlapCheck';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { Pagination } from '@/components/ui/Pagination';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import type { IJob, JobFilters as JobFiltersType, BidWithJob } from '@/types/job.types';
import { UserStatus, LicenseStatus, UserRole } from '@/types/enums';
import { Briefcase, Loader2, Search, X } from 'lucide-react';

export default function MateJobsPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<IJob[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acceptedBids, setAcceptedBids] = useState<BidWithJob[]>([]);

  // Read filters from URL
  const filtersFromUrl = (): JobFiltersType => ({
    search: searchParams.get('search') || undefined,
    locationCity: searchParams.get('locationCity') || undefined,
    budgetType: (searchParams.get('budgetType') as JobFiltersType['budgetType']) || undefined,
    budgetMin: searchParams.get('budgetMin') ? Number(searchParams.get('budgetMin')) : undefined,
    budgetMax: searchParams.get('budgetMax') ? Number(searchParams.get('budgetMax')) : undefined,
    startDate: searchParams.get('startDate') || undefined,
    requiredSkills: searchParams.get('requiredSkills') ? searchParams.get('requiredSkills')!.split(',') : undefined,
    sortBy: (searchParams.get('sortBy') as JobFiltersType['sortBy']) || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 12,
  });

  const [filters, setFilters] = useState<JobFiltersType>(filtersFromUrl());

  const syncUrl = useCallback((f: JobFiltersType) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'limit') {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (!Array.isArray(value)) {
          params.set(key, String(value));
        }
      }
    });
    router.push(`/dashboard/mate/jobs?${params.toString()}`);
  }, [router]);

  const handleFiltersChange = useCallback((updates: Partial<JobFiltersType>) => {
    const newFilters = { ...filters, ...updates, page: updates.page ?? 1 };
    setFilters(newFilters);
    syncUrl(newFilters);
  }, [filters, syncUrl]);

  const handleReset = useCallback(() => {
    const def: JobFiltersType = { sortBy: 'newest', page: 1, limit: 12 };
    setFilters(def);
    router.push('/dashboard/mate/jobs');
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const [jobsResp, bidsResp] = await Promise.all([
          getJobs(filters),
          getMyBids({ status: 'ACCEPTED', limit: 100 })
        ]);
        if (jobsResp.success && jobsResp.data) {
          setJobs(jobsResp.data.data);
          setTotal(jobsResp.data.total);
          setTotalPages(jobsResp.data.totalPages);
        }
        if (bidsResp.success && bidsResp.data) {
          setAcceptedBids(bidsResp.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch jobs or bids:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user, filters]);

  if (userLoading) return <DashboardSkeleton />;

  const isGuardReady = user?.status === UserStatus.ACTIVE && user?.role === UserRole.MATE && user.licenseStatus === LicenseStatus.VALID;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">Job Marketplace</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Browse and apply for security jobs • {total} jobs available
          </p>
          {!isGuardReady && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20 text-xs text-[var(--color-warning)] font-medium">
              ⚠️ Your account must be ACTIVE with a VALID license to apply for jobs.
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <JobFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleReset}
            className="w-full lg:w-72 shrink-0"
          />

          {/* Jobs Grid */}
          <div className="flex-1 min-w-0">
            {/* Mobile search */}
            <div className="lg:hidden mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={filters.search || ''}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] focus:border-[var(--color-input-border-focus)] focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : jobs.length === 0 ? (
              <Card className="p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
                <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">No jobs found</h3>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                  Try adjusting your filters or check back later.
                </p>
                <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<X className="h-3 w-3" />} className="border border-[var(--color-surface-border)]">
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {jobs.map((job) => {
                    const overlapBid = acceptedBids.find(b => 
                      b.job && checkDateOverlap(new Date(job.startDate), new Date(job.endDate), new Date(b.job.startDate), new Date(b.job.endDate))
                    );
                    const overlapWarning = overlapBid ? `This job overlaps with your existing shift on ${new Date(overlapBid.job!.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : undefined;

                    return (
                      <JobCard
                        key={job.jobId}
                        job={job}
                        linkPrefix="/dashboard/mate/jobs"
                        overlapWarning={overlapWarning}
                      />
                    );
                  })}
                </div>

                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  totalItems={total}
                  itemsPerPage={12}
                  showItemCount
                  onPageChange={(page) => handleFiltersChange({ page })}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
