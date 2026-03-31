'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { getJobById, assignShifts } from '@/lib/api/job.api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import toast from 'react-hot-toast';
import type { IJob, ShiftScheduleDay, ShiftSlot, AcceptedGuard, ShiftAssignment } from '@/types/job.types';
import { JobStatus, HiringStatus } from '@/types/enums';
import { doSlotsOverlap } from '@/lib/utils/shiftCalculations';
import { ChevronLeft, Calendar, AlertTriangle, CheckCircle2, Clock, Moon } from 'lucide-react';

export default function AssignShiftsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Local state for assignments: map of "date_slotNumber" -> guardUid
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!jobId) return;
    const fetch = async () => {
      try {
        const resp = await getJobById(jobId);
        if (resp.success && resp.data) {
          const j = resp.data;
          setJob(j);

          // Initialize local assignments from existing schedule
          const init: Record<string, string> = {};
          if (j.shiftSchedule) {
            for (const day of j.shiftSchedule) {
              for (const slot of day.slots) {
                if (slot.assignedGuardUid) {
                  init[`${day.date}_${slot.slotNumber}`] = slot.assignedGuardUid;
                }
              }
            }
          }
          setAssignments(init);
        } else {
          toast.error('Failed to load job');
        }
      } catch {
        toast.error('Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [jobId]);

  // Compute overlaps on the fly
  const overlapsError = useMemo(() => {
    if (!job || !job.shiftSchedule) return null;
    const schedule = job.shiftSchedule as ShiftScheduleDay[];
    
    // Check per guard per day
    const guardDaySlots: Record<string, { startTime: string; endTime: string }[]> = {};

    for (const day of schedule) {
      for (const slot of day.slots) {
        const key = `${day.date}_${slot.slotNumber}`;
        const guardUid = assignments[key];
        if (!guardUid) continue;

        const gKey = `${guardUid}_${day.date}`;
        if (!guardDaySlots[gKey]) guardDaySlots[gKey] = [];

        // check overlap against existing
        for (const existing of guardDaySlots[gKey]) {
          if (doSlotsOverlap(slot.startTime, slot.endTime, existing.startTime, existing.endTime)) {
            const guard = (job.acceptedGuards as AcceptedGuard[]).find(g => g.guardUid === guardUid);
            return `Guard ${guard?.guardName || 'Unknown'} has overlapping shifts on ${day.date}: ${slot.startTime}-${slot.endTime} conflicts with ${existing.startTime}-${existing.endTime}.`;
          }
        }
        guardDaySlots[gKey].push({ startTime: slot.startTime, endTime: slot.endTime });
      }
    }
    return null;
  }, [assignments, job]);

  const allAssigned = useMemo(() => {
    if (!job || !job.shiftSchedule) return false;
    for (const day of job.shiftSchedule as ShiftScheduleDay[]) {
      for (const slot of day.slots) {
        if (!assignments[`${day.date}_${slot.slotNumber}`]) return false;
      }
    }
    return true;
  }, [assignments, job]);

  const handleAssign = (date: string, slotNumber: number, guardUid: string) => {
    setAssignments(prev => ({
      ...prev,
      [`${date}_${slotNumber}`]: guardUid,
    }));
  };

  const handleSubmit = async () => {
    if (!job) return;
    if (overlapsError) {
      toast.error(overlapsError);
      return;
    }

    setSubmitting(true);
    try {
      // Build assignment array
      const payload: ShiftAssignment[] = Object.entries(assignments)
        .filter(([, guardUid]) => !!guardUid)
        .map(([key, guardUid]) => {
          const [date, slotNumStr] = key.split('_');
          return {
            date,
            slotNumber: parseInt(slotNumStr, 10),
            guardUid,
          };
        });
      
      const resp = await assignShifts(job.jobId, payload);
      if (resp.success) {
        toast.success(allAssigned ? 'All shifts assigned successfully! Guards have been notified.' : 'Shift assignments saved.');
        router.push(`/dashboard/boss/jobs/${job.jobId}`);
      } else {
        toast.error(resp.message || 'Failed to save assignments.');
      }
    } catch {
      toast.error('Failed to save assignments.');
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading || loading) return <DashboardSkeleton />;
  if (!job) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <Link href="/dashboard/boss/jobs"><Button variant="ghost" size="sm">Back to Jobs</Button></Link>
    </div>
  );

  if (job.status !== JobStatus.FILLED || job.hiringStatus !== HiringStatus.FULLY_HIRED) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-[var(--color-warning)] mx-auto mb-4" />
        <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-2">Not Ready for Assignment</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Shifts can only be assigned once all guards have been hired for this job.
        </p>
        <Link href={`/dashboard/boss/jobs/${job.jobId}`}>
          <Button size="sm">Back to Job</Button>
        </Link>
      </div>
    );
  }

  const acceptedGuards = (job.acceptedGuards || []) as AcceptedGuard[];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 border-x border-[var(--color-surface-border)] bg-[var(--color-bg-primary)] min-h-screen">
        <button onClick={() => router.push(`/dashboard/boss/jobs/${job.jobId}`)} className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] mb-6 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Job Details
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight mb-2">Assign Shifts: {job.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Select a guard for each shift slot. A guard cannot work overlapping shifts on the same day.
            Once all slots are assigned, the finalized schedule will be emailed to each guard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Guards Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">Hired Guards ({acceptedGuards.length}/{job.numberOfGuardsNeeded})</h3>
            <div className="flex flex-col gap-2">
              {acceptedGuards.map((g) => (
                <div key={g.guardUid} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]">
                  <Avatar src={g.guardPhoto || undefined} name={g.guardName} size="sm" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{g.guardName}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">Status</span>
                {allAssigned 
                  ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> 
                  : <span className="text-[10px] font-bold text-[var(--color-warning)]">Incomplete</span>
                }
              </div>
              <div className="w-full bg-[var(--color-surface-border)] rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${allAssigned ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]'}`} 
                  style={{ width: `${(Object.values(assignments).filter(Boolean).length / ((job.shiftSchedule?.length || 1) * job.numberOfGuardsNeeded)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Builder */}
          <div className="md:col-span-3 space-y-6">
            {overlapsError && (
              <div className="p-3 rounded-xl bg-[var(--color-danger-light)] text-[var(--color-danger)] text-sm font-bold flex items-start gap-2 border border-[var(--color-danger)]/20">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{overlapsError}</span>
              </div>
            )}

            <div className="space-y-4">
              {job.shiftSchedule?.map((day: ShiftScheduleDay, di: number) => (
                <Card key={di} className="overflow-visible !p-0">
                  <div className="p-3 bg-[var(--color-bg-subtle)] border-b border-[var(--color-surface-border)] flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                      {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h4>
                  </div>
                  <div className="p-0 divide-y divide-[var(--color-surface-border)]">
                    {day.slots.map((slot: ShiftSlot) => {
                      const ass = assignments[`${day.date}_${slot.slotNumber}`];
                      return (
                        <div key={slot.slotNumber} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${!ass ? 'bg-[var(--color-warning-light)]/20' : ''}`}>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
                              Slot {slot.slotNumber}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                                {slot.startTime} – {slot.endTime}
                              </span>
                              {slot.isOvernight && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <Moon className="h-2.5 w-2.5" /> Overnight
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full">
                                {slot.durationHours}h
                              </span>
                            </div>
                          </div>
                          
                          <div className="w-full sm:w-64 shrink-0">
                            <select
                              value={ass || ''}
                              onChange={(e) => handleAssign(day.date, slot.slotNumber, e.target.value)}
                              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors ${
                                ass 
                                  ? 'border-[var(--color-success)] bg-[var(--color-success-light)] text-[var(--color-success)] dark:bg-[var(--color-success)]/10 font-bold' 
                                  : 'border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)]'
                              }`}
                            >
                              <option value="" disabled>Select Guard...</option>
                              {acceptedGuards.map(g => (
                                <option key={g.guardUid} value={g.guardUid}>{g.guardName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-surface-border)]">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !!overlapsError}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                {submitting ? 'Saving...' : allAssigned ? 'Save Final Assignments' : 'Save Draft Assignments'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
