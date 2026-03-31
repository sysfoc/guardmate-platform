'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Modal } from '@/components/ui/Modal';
import { MapDisplay } from '@/components/maps/MapDisplay';
import { getAdminJobs } from '@/lib/api/admin.api';
import { JobStatus, BudgetType } from '@/types/enums';
import type { IJob } from '@/types/job.types';
import {
  Briefcase, Search, Loader2, MapPin, Calendar, Users, Filter, X
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: JobStatus.DRAFT, label: 'Draft' },
  { value: JobStatus.OPEN, label: 'Open' },
  { value: JobStatus.FILLED, label: 'Filled' },
  { value: JobStatus.IN_PROGRESS, label: 'In Progress' },
  { value: JobStatus.COMPLETED, label: 'Completed' },
  { value: JobStatus.CANCELLED, label: 'Cancelled' },
  { value: JobStatus.EXPIRED, label: 'Expired' },
];

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const limit = 20;

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const resp = await getAdminJobs({
          page,
          limit,
          status: statusFilter || undefined,
          search: search || undefined,
        });
        if (resp.success && resp.data) {
          setJobs(resp.data.data);
          setTotal(resp.data.total);
          setTotalPages(resp.data.totalPages);
        }
      } catch (err) {
        console.error('Failed to fetch admin jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [page, statusFilter, search]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-[var(--color-primary)]" />
            Jobs Overview
          </h1>
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            {total} jobs across the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search by title, company, or Job ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={handleSearch} className="h-[36px] border border-[var(--color-surface-border)]">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <h3 className="font-bold text-sm mb-1">No jobs found</h3>
          <p className="text-xs text-[var(--color-text-tertiary)]">Try adjusting your filters.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-surface-border)] bg-[var(--color-bg-subtle)]">
                  <th className="text-left px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Job Title</th>
                  <th className="text-left px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Boss / Company</th>
                  <th className="text-left px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Location</th>
                  <th className="text-left px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Start Date</th>
                  <th className="text-center px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Bids</th>
                  <th className="text-center px-4 py-3 font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Guards</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr 
                    key={job.jobId} 
                    onClick={() => setSelectedJob(job)}
                    className="border-b border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--color-text-primary)] truncate max-w-[200px]">{job.title}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 font-mono">{job.jobId.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--color-text-secondary)] truncate max-w-[150px]">{job.companyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                        <MapPin className="h-3 w-3" />
                        {job.locationCity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-col text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </span>
                        {job.shiftSchedule && job.shiftSchedule.length > 1 && (
                          <span className="text-[9px] text-[var(--color-text-muted)] ml-4">
                            to {new Date(job.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[var(--color-text-primary)]">
                      {job.totalBids}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-[var(--color-text-secondary)]">
                        <Users className="h-3 w-3" />
                        {job.numberOfGuardsNeeded}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={limit}
        showItemCount
        onPageChange={setPage}
      />

      {/* Job Details Modal */}
      <Modal 
        isOpen={!!selectedJob} 
        onClose={() => setSelectedJob(null)} 
        title="Job Details" 
        size="md"
      >
        {selectedJob && (
          <div className="space-y-4 text-sm mt-4">
            <div>
              <h3 className="font-bold text-lg text-[var(--color-text-primary)]">{selectedJob.title}</h3>
              <p className="text-[var(--color-text-secondary)]">{selectedJob.companyName}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 bg-[var(--color-bg-subtle)] p-3 rounded-xl border border-[var(--color-surface-border)]">
              <div className="col-span-1">
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-tertiary)] flex items-center gap-1"><MapPin className="h-3 w-3"/> Location</p>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5">{selectedJob.locationCity}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-tertiary)] flex items-center gap-1">Budget</p>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5">
                  £{selectedJob.budgetAmount}{selectedJob.budgetType === BudgetType.HOURLY ? '/hr' : ' Fixed'}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-tertiary)] flex items-center gap-1">Hours</p>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5">
                  {selectedJob.totalScheduledHours || selectedJob.totalHours} hrs
                </p>
              </div>
            </div>

            {selectedJob.coordinates && (
              <div className="rounded-xl overflow-hidden border border-[var(--color-surface-border)]">
                <MapDisplay
                  center={selectedJob.coordinates}
                  zoom={15}
                  height="200px"
                  interactive={false}
                  markers={[{
                    lat: selectedJob.coordinates.lat,
                    lng: selectedJob.coordinates.lng,
                    title: selectedJob.title,
                    jobId: selectedJob.jobId,
                    budget: selectedJob.budgetAmount,
                    budgetType: selectedJob.budgetType,
                    status: selectedJob.status,
                    isUrgent: selectedJob.isUrgent,
                    onClick: () => {}
                  }]}
                />
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedJob(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
