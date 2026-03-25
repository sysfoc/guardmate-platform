'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { JobStatusBadge } from './JobStatusBadge';
import { MapDisplay } from '@/components/maps/MapDisplay';
import type { IJob } from '@/types/job.types';
import { BudgetType } from '@/types/enums';
import {
  MapPin, Calendar, Clock, PoundSterling, Users, Eye,
  ShieldCheck, HeartPulse, HardHat, Baby, Zap, Globe,
  Briefcase, CheckCircle2, Timer,
} from 'lucide-react';

interface JobDetailViewProps {
  job: IJob;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function JobDetailView({ job, actions, children }: JobDetailViewProps) {
  const budgetDisplay = job.budgetType === BudgetType.HOURLY
    ? `£${job.budgetAmount}/hr`
    : `£${job.budgetAmount}${job.budgetMax ? ` – £${job.budgetMax}` : ''}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar src={job.companyLogo ?? undefined} name={job.companyName} size="lg" />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">{job.title}</h1>
                <JobStatusBadge status={job.status} size="md" />
                {job.isUrgent && (
                  <Badge variant="danger" className="text-[9px] h-5 gap-0.5"><Zap className="h-3 w-3" /> URGENT</Badge>
                )}
                {job.isFeatured && (
                  <Badge variant="warning" className="text-[9px] h-5">FEATURED</Badge>
                )}
              </div>
              <p className="text-sm font-bold text-[var(--color-text-secondary)]">{job.companyName}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-tertiary)]">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {job.viewCount} views</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.totalBids} bids</span>
                <span>Posted {new Date(job.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card className="p-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4 text-[var(--color-primary)]" /> Overview</h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{job.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Badge className="text-[9px] h-5">{job.jobType.replace('_', ' ')}</Badge>
              <span className="text-xs text-[var(--color-text-tertiary)]">{job.numberOfGuardsNeeded} guard{job.numberOfGuardsNeeded > 1 ? 's' : ''} needed</span>
            </div>
          </Card>

          {/* Schedule */}
          <Card className="p-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-[var(--color-primary)]" /> Schedule</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Start Date" value={new Date(job.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
              <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="End Date" value={new Date(job.endDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
              <InfoItem icon={<Clock className="h-3.5 w-3.5" />} label="Working Hours" value={`${job.startTime} – ${job.endTime}${job.isFlexibleTime ? ' (Flexible)' : ''}`} />
              <InfoItem icon={<Timer className="h-3.5 w-3.5" />} label="Total Hours" value={`${job.totalHours}h`} />
              <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Application Deadline" value={new Date(job.applicationDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
            </div>
          </Card>

          {/* Requirements */}
          <Card className="p-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" /> Requirements</h2>
            {job.requiredSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((s) => (
                    <span key={s} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:bg-[var(--color-primary)]/10">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {job.requiredLicenseType && (
                <CertItem icon={<ShieldCheck className="h-4 w-4 text-[var(--color-success)]" />} label={job.requiredLicenseType} />
              )}
              {job.requiresFirstAid && <CertItem icon={<HeartPulse className="h-4 w-4 text-[var(--color-danger)]" />} label="First Aid Certificate" />}
              {job.requiresWhiteCard && <CertItem icon={<HardHat className="h-4 w-4 text-[var(--color-warning)]" />} label="White Card" />}
              {job.requiresChildrenCheck && <CertItem icon={<Baby className="h-4 w-4 text-[var(--color-info)]" />} label="Children Check" />}
            </div>
            {job.minExperience > 0 && <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Min. <strong>{job.minExperience} year{job.minExperience > 1 ? 's' : ''}</strong> experience required</p>}
            {job.preferredLanguages.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Preferred Languages</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{job.preferredLanguages.join(', ')}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget */}
          <Card className="p-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><PoundSterling className="h-4 w-4 text-[var(--color-primary)]" /> Budget</h2>
            <p className="text-2xl font-black text-[var(--color-text-primary)]">{budgetDisplay}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] font-bold uppercase mt-1">{job.budgetType} Rate</p>
          </Card>

          {/* Location */}
          <Card className="p-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--color-primary)]" /> Location</h2>
            <p className="text-sm text-[var(--color-text-primary)] font-medium">{job.location}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{job.locationCity}{job.locationState ? `, ${job.locationState}` : ''}{job.locationCountry ? `, ${job.locationCountry}` : ''}</p>
            {job.locationPostalCode && <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{job.locationPostalCode}</p>}
            
            {job.coordinates && (
              <div className="mt-4 rounded-xl overflow-hidden border border-[var(--color-surface-border)]">
                <MapDisplay
                  center={job.coordinates}
                  zoom={15}
                  height="250px"
                  interactive={false}
                  markers={[{
                    lat: job.coordinates.lat,
                    lng: job.coordinates.lng,
                    title: job.title,
                    jobId: job.jobId,
                    budget: job.budgetAmount,
                    budgetType: job.budgetType,
                    status: job.status,
                    isUrgent: job.isUrgent,
                    onClick: () => {}
                  }]}
                />
              </div>
            )}
          </Card>

          {children}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[var(--color-text-muted)] mt-0.5">{icon}</span>
      <div>
        <p className="text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">{label}</p>
        <p className="text-xs text-[var(--color-text-primary)] font-medium">{value}</p>
      </div>
    </div>
  );
}

function CertItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-subtle)]">
      {icon}
      <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}
