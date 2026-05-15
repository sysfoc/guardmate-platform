'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin, Calendar, Clock, Eye, Users, Zap,
  Briefcase, DollarSign, ChevronRight,
  ShieldCheck, HeartPulse, HardHat, Baby,
  CheckCircle2, Sparkles
} from 'lucide-react';

/* ─── Match Score Badge (grid view) ──────────────────────────────────────── */
function MatchScoreBadge({ score, breakdown }: { score: number; breakdown?: MatchBreakdown }) {
  const config =
    score >= 80
      ? { dot: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' }
      : score >= 60
      ? { dot: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' }
      : { dot: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' };

  return (
    <Tooltip content={breakdown ? `Skills: ${breakdown.skills}% • License: ${breakdown.license}% • Experience: ${breakdown.experience}%` : `${score}% match`}>
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${config.bg} ${config.border} cursor-default`}>
        <div className={`w-2 h-2 rounded-full ${config.dot} ring-2 ring-offset-1 ring-offset-gray-900 ${config.border}`} />
        <span className={`text-sm font-black ${config.text} leading-none`}>{score}%</span>
      </div>
    </Tooltip>
  );
}

/* ─── Match Badge (list view) ────────────────────────────────────────────── */
function MatchBadge({ score }: { score: number }) {
  const colorClass =
    score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800' :
    score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800' :
    'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800';
  return (
    <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-md border shadow-sm ${colorClass}`}>
      <Sparkles className="h-3 w-3" />
      <span>{score}%</span>
      <span className="opacity-70 font-semibold">Match</span>
    </span>
  );
}
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from './JobStatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import type { IJob } from '@/types/job.types';
import { BudgetType, HiringStatus } from '@/types/enums';

interface MatchBreakdown {
  skills: number;
  license: number;
  experience: number;
}

interface JobCardProps {
  job: IJob;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
  linkPrefix?: string;
  overlapWarning?: string;
  distance?: number;
  matchScore?: number;
  matchBreakdown?: MatchBreakdown;
}

function getMatchColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 80) return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' };
  if (score >= 60) return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' };
  return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' };
}

export function JobCard({ job, showActions = false, viewMode = 'grid', linkPrefix = '/dashboard/mate/jobs', overlapWarning, distance, matchScore, matchBreakdown }: JobCardProps) {
  const budgetDisplay = job.budgetType === BudgetType.HOURLY
    ? `$${job.budgetAmount}/hr`
    : `$${job.budgetAmount}${job.budgetMax ? ` – $${job.budgetMax}` : ''}`;

  const timeAgo = getTimeAgo(new Date(job.createdAt));
  const deadlineLeft = getDeadlineLeft(new Date(job.applicationDeadline));

  const isMultiDay = job.shiftSchedule && job.shiftSchedule.length > 1;
  const totalDays = job.shiftSchedule ? job.shiftSchedule.length : 1;
  const isPartiallyHired = job.hiringStatus === HiringStatus.OPEN && job.acceptedGuards && job.acceptedGuards.length > 0;
  const guardsHired = job.acceptedGuards ? job.acceptedGuards.length : 0;

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
            <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-text-tertiary)] font-medium flex-wrap">
              <span>{job.companyName}</span>
              <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.locationCity}</span>
              {distance !== undefined && (
                <span className="font-bold text-[var(--color-primary)]">{distance} mi away</span>
              )}
              <span className="flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {isMultiDay
                  ? `${new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(job.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                  : new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className="font-bold text-[var(--color-text-primary)]">{budgetDisplay}</span>
              {isPartiallyHired && (
                <span className="font-bold text-[var(--color-info)] bg-[var(--color-info)]/10 px-1.5 py-0.5 rounded-sm">
                  {guardsHired}/{job.numberOfGuardsNeeded} Hired
                </span>
              )}
              {matchScore !== undefined && <MatchBadge score={matchScore} />}
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
      <div className="p-2 pb-1 flex-1 rounded-t-xl">
        {/* Top row: Company info (left) + AI Match (right) */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider truncate">
              {job.companyName}
            </p>
          </div>
          {matchScore !== undefined && (
            <div className="shrink-0">
              <MatchScoreBadge score={matchScore} breakdown={matchBreakdown} />
            </div>
          )}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
              <span className="truncate">{job.locationCity}{job.locationState ? `, ${job.locationState}` : ''}</span>
            </div>
            {distance !== undefined && (
              <span className="font-bold text-[var(--color-primary)] shrink-0">{distance} mi</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
            <span>
              {isMultiDay
                ? `${new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to ${new Date(job.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
            <span>{isMultiDay ? `${totalDays} days • ${job.totalScheduledHours || job.totalHours} hrs total` : `${job.totalScheduledHours || job.totalHours} hours total`}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
              <span className="font-bold text-[var(--color-text-primary)]">{budgetDisplay}</span>
            </div>
            {isPartiallyHired && <span className="text-[9px] font-bold text-[var(--color-info)] bg-[var(--color-info)]/10 px-1.5 py-0.5 rounded-sm">{guardsHired}/{job.numberOfGuardsNeeded} Hired</span>}
            {job.hiringStatus === HiringStatus.FULLY_HIRED && <span title="Fully Hired"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" /></span>}
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

        {/* Bottom row: requirement icons (left) + status badges (right) */}
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-2 shrink-0">
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
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[var(--color-card-header-bg)] border-t border-[var(--color-card-border)] flex items-center justify-between rounded-b-xl">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-0.5">
            <Users className="h-3.5 w-3.5" /> {job.totalBids} bids
          </span>
          <span className="flex items-center gap-0.5">
            <Eye className="h-3.5 w-3.5" /> {job.viewCount}
          </span>
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
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
