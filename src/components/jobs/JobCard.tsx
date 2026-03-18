'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin, Calendar, Clock, Eye, Users, Zap,
  Briefcase, PoundSterling, ChevronRight,
  ShieldCheck, HeartPulse, HardHat, Baby,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from './JobStatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import type { IJob } from '@/types/job.types';
import { BudgetType } from '@/types/enums';

interface JobCardProps {
  job: IJob;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
  linkPrefix?: string;
  overlapWarning?: string;
}

export function JobCard({ job, showActions = false, viewMode = 'grid', linkPrefix = '/dashboard/mate/jobs', overlapWarning }: JobCardProps) {
  const budgetDisplay = job.budgetType === BudgetType.HOURLY
    ? `£${job.budgetAmount}/hr`
    : `£${job.budgetAmount}${job.budgetMax ? ` – £${job.budgetMax}` : ''}`;

  const timeAgo = getTimeAgo(new Date(job.createdAt));
  const deadlineLeft = getDeadlineLeft(new Date(job.applicationDeadline));

  if (viewMode === 'list') {
    return (
      <Card className="!overflow-visible relative z-10 hover:z-50 p-4 hover:border-[var(--color-card-hover-border)] transition-all duration-200 group">
        <div className="flex items-center gap-4">
          <Avatar
            src={job.companyLogo ?? undefined}
            name={job.companyName}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {overlapWarning ? (
                <span className="font-bold text-sm text-[var(--color-text-primary)] cursor-not-allowed opacity-60 truncate">
                  {job.title}
                </span>
              ) : (
                <Link href={`${linkPrefix}/${job.jobId}`} className="font-bold text-sm text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate">
                  {job.title}
                </Link>
              )}
              <JobStatusBadge status={job.status} />
              {overlapWarning && (
                <Badge variant="danger" className="text-[8px] h-4 gap-0.5">
                  Date Conflict
                </Badge>
              )}
              {job.isUrgent && (
                <Badge variant="danger" className="text-[8px] h-4 gap-0.5">
                  <Zap className="h-2.5 w-2.5" /> URGENT
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-text-tertiary)] font-medium">
              <span>{job.companyName}</span>
              <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.locationCity}</span>
              <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              <span className="font-bold text-[var(--color-text-primary)]">{budgetDisplay}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{job.totalBids}</span>
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{job.viewCount}</span>
            {overlapWarning ? (
              <Tooltip content={overlapWarning}>
                <span className="cursor-not-allowed opacity-50">
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                </span>
              </Tooltip>
            ) : (
              <Link href={`${linkPrefix}/${job.jobId}`}>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
              </Link>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="!overflow-visible relative z-10 hover:z-50 p-0 hover:border-[var(--color-card-hover-border)] transition-all duration-200 hover:shadow-md group flex flex-col rounded-xl">
      {/* Header */}
      <div className="p-4 pb-3 flex-1 rounded-t-xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={job.companyLogo ?? undefined}
              name={job.companyName}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider truncate">
                {job.companyName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {job.isUrgent && (
              <Badge variant="danger" className="text-[8px] h-4 gap-0.5 px-1.5">
                <Zap className="h-2.5 w-2.5" /> URGENT
              </Badge>
            )}
            {overlapWarning && (
              <Badge variant="danger" className="text-[8px] h-4 gap-0.5 px-1.5">
                Date Conflict
              </Badge>
            )}
            <JobStatusBadge status={job.status} />
          </div>
        </div>

        {overlapWarning ? (
          <Tooltip content={overlapWarning}>
            <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-2 line-clamp-2 leading-snug cursor-not-allowed opacity-60">
              {job.title}
            </h3>
          </Tooltip>
        ) : (
          <Link href={`${linkPrefix}/${job.jobId}`}>
            <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-snug">
              {job.title}
            </h3>
          </Link>
        )}

        {/* Meta row */}
        <div className="space-y-1.5 text-[10px] text-[var(--color-text-secondary)] font-medium">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
            <span className="truncate">{job.locationCity}{job.locationState ? `, ${job.locationState}` : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
            <span>{new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <PoundSterling className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
            <span className="font-bold text-[var(--color-text-primary)]">{budgetDisplay}</span>
          </div>
        </div>

        {/* Skills */}
        {job.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {job.requiredSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:bg-[var(--color-primary)]/10"
              >
                {skill}
              </span>
            ))}
            {job.requiredSkills.length > 3 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 text-[var(--color-text-muted)]">
                +{job.requiredSkills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Certificate icons */}
        <div className="flex items-center gap-2 mt-2">
          {job.requiresFirstAid && (
            <span className="text-[var(--color-danger)]" title="First Aid Required">
              <HeartPulse className="h-3.5 w-3.5" />
            </span>
          )}
          {job.requiresWhiteCard && (
            <span className="text-[var(--color-warning)]" title="White Card Required">
              <HardHat className="h-3.5 w-3.5" />
            </span>
          )}
          {job.requiresChildrenCheck && (
            <span className="text-[var(--color-info)]" title="Children Check Required">
              <Baby className="h-3.5 w-3.5" />
            </span>
          )}
          {job.requiredLicenseType && (
            <span className="text-[var(--color-success)]" title={`License: ${job.requiredLicenseType}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[var(--color-card-header-bg)] border-t border-[var(--color-card-border)] flex items-center justify-between rounded-b-xl">
        <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-0.5">
            <Users className="h-3 w-3" /> {job.totalBids} bids
          </span>
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" /> {job.viewCount}
          </span>
        </div>
        <span className="text-[9px] text-[var(--color-text-muted)] font-medium">
          {timeAgo}
        </span>
      </div>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getDeadlineLeft(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours}h left`;
}
