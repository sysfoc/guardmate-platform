'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { JobStatusBadge } from './JobStatusBadge';
import { MapDisplay } from '@/components/maps/MapDisplay';
import type { IJob, ShiftScheduleDay, ShiftSlot } from '@/types/job.types';
import { BudgetType } from '@/types/enums';
import {
  MapPin, Calendar, Clock, PoundSterling, Users, Eye,
  ShieldCheck, HeartPulse, HardHat, Baby, Zap, Globe,
  Briefcase, CheckCircle2, Timer, Moon,
} from 'lucide-react';

interface JobDetailViewProps {
  job: IJob;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  currentUserUid?: string;
}

export function JobDetailView({ job, actions, children, currentUserUid }: JobDetailViewProps) {
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
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-primary)]" /> Schedule
            </h2>
            
            {job.shiftSchedule && job.shiftSchedule.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-[var(--color-surface-border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-surface-border)]">
                      <tr>
                        <th className="px-4 py-3 font-bold text-[var(--color-text-secondary)]">Date</th>
                        {Array.from({ length: job.numberOfGuardsNeeded }).map((_, i) => (
                          <th key={i} className="px-4 py-3 font-bold text-[var(--color-text-secondary)]">Guard {i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-surface-border)]">
                      {job.shiftSchedule.map((day: ShiftScheduleDay, i: number) => (
                        <tr key={i} className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          {Array.from({ length: job.numberOfGuardsNeeded }).map((_, g) => {
                            const slot = day.slots.find((s: ShiftSlot) => s.slotNumber === g + 1);
                            const isMySlot = !!currentUserUid && slot?.assignedGuardUid === currentUserUid;

                            return (
                              <td key={g} className={`px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap relative ${isMySlot ? 'bg-[var(--color-primary-light)]/50 dark:bg-[var(--color-primary)]/10' : ''}`}>
                                {isMySlot && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-primary)]"></div>}
                                {slot ? (
                                  <div className="flex flex-col gap-0.5">
                                    {isMySlot && <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-wider mb-0.5 flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Your Shift</span>}
                                    <span className={`font-medium ${isMySlot ? 'text-[var(--color-primary-dark)] dark:text-[var(--color-primary-light)]' : 'text-[var(--color-text-primary)]'}`}>
                                      {slot.startTime} – {slot.endTime}
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {slot.isOvernight && (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                          <Moon className="h-2 w-2" /> Overnight
                                        </span>
                                      )}
                                      <span className="text-[9px] font-bold text-[var(--color-text-tertiary)] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 rounded-full">
                                        {slot.durationHours}h
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[var(--color-text-muted)] italic">No shift</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-primary-light)] dark:bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
                    <Timer className="h-4 w-4" />
                    <span>Total Scheduled Hours: {job.totalScheduledHours || job.totalHours}</span>
                  </div>
                  <Badge variant="neutral" className="text-[10px]">{job.shiftSchedule.length} days</Badge>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Start Date" value={new Date(job.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
                <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="End Date" value={new Date(job.endDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
                <InfoItem icon={<Clock className="h-3.5 w-3.5" />} label="Working Hours" value={`${job.startTime} – ${job.endTime}${job.isFlexibleTime ? ' (Flexible)' : ''}`} />
                <InfoItem icon={<Timer className="h-3.5 w-3.5" />} label="Total Hours" value={`${job.totalHours}h`} />
                <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Application Deadline" value={new Date(job.applicationDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
              </div>
            )}
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
