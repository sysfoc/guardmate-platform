'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { createJob } from '@/lib/api/job.api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { LocationSearch } from '@/components/maps/LocationSearch';
import { MapDisplay } from '@/components/maps/MapDisplay';
import toast from 'react-hot-toast';
import type { CreateJobPayload, LocationSearchResult, Coordinates, ShiftScheduleDay, ShiftSlot } from '@/types/job.types';
import { JobType, BudgetType, JobStatus } from '@/types/enums';
import {
  isOvernightShift,
  calculateShiftDuration,
  getActualEndDate,
  calculateTotalScheduledHours,
  validateShiftSlot,
  generateDateRange,
} from '@/lib/utils/shiftCalculations';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Briefcase, MapPin,
  PoundSterling, Plus, Zap, Clock, Calendar, Users, ShieldCheck,
  FileText, Repeat, HandshakeIcon, X, AlertTriangle, Moon,
} from 'lucide-react';

const STEPS = ['Job Basics', 'Location & Schedule', 'Requirements & Budget'];
const LICENSE_OPTIONS = ['Door Supervisor', 'Close Protection', 'Security Guard', 'CCTV Operator'];

// ─── Schedule State Types ─────────────────────────────────────────────────────

interface ScheduleInput {
  startTime: string;
  endTime: string;
}

interface DayScheduleInput {
  date: string;
  sameForAllGuards: boolean;
  sharedSlot: ScheduleInput;
  guardSlots: ScheduleInput[];
}

export default function NewJobPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdJobId, setCreatedJobId] = useState('');

  const [form, setForm] = useState<Partial<CreateJobPayload>>({
    title: '', description: '', jobType: JobType.ONE_TIME,
    isUrgent: false, numberOfGuardsNeeded: 1,
    location: '', locationCity: '', locationState: '', locationCountry: '', locationPostalCode: '',
    coordinates: null,
    startDate: '', endDate: '',
    isFlexibleTime: false, applicationDeadline: '',
    budgetType: BudgetType.HOURLY, budgetAmount: 0, budgetMax: undefined,
    requiredSkills: [], requiredLicenseType: undefined,
    requiresFirstAid: false, requiresWhiteCard: false, requiresChildrenCheck: false,
    minExperience: 0, preferredLanguages: [],
  });

  const [mapCoords, setMapCoords] = useState<Coordinates | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  // ─── Schedule Builder State ───────────────────────────────────────────────
  const [sameEveryDay, setSameEveryDay] = useState(true);
  const [sharedDayTemplate, setSharedDayTemplate] = useState<ScheduleInput>({ startTime: '08:00', endTime: '18:00' });
  const [daySchedules, setDaySchedules] = useState<DayScheduleInput[]>([]);

  const guardsNeeded = form.numberOfGuardsNeeded || 1;

  // Generate day schedules when dates or guards change
  const regenerateSchedule = useCallback(() => {
    if (!form.startDate || !form.endDate) {
      setDaySchedules([]);
      return;
    }
    const dates = generateDateRange(form.startDate, form.endDate);
    setDaySchedules(dates.map((date) => ({
      date,
      sameForAllGuards: true,
      sharedSlot: { startTime: '08:00', endTime: '18:00' },
      guardSlots: Array.from({ length: guardsNeeded }, () => ({ startTime: '08:00', endTime: '18:00' })),
    })));
  }, [form.startDate, form.endDate, guardsNeeded]);

  useEffect(() => {
    regenerateSchedule();
  }, [regenerateSchedule]);

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  const update = (data: Partial<CreateJobPayload>) => setForm((p) => ({ ...p, ...data }));

  // ─── Build shiftSchedule from UI state ──────────────────────────────────
  const buildShiftSchedule = (): ShiftScheduleDay[] => {
    return daySchedules.map((day) => {
      const slots: ShiftSlot[] = [];
      for (let g = 0; g < guardsNeeded; g++) {
        const input = sameEveryDay
          ? sharedDayTemplate
          : (day.sameForAllGuards ? day.sharedSlot : day.guardSlots[g] || day.sharedSlot);
        const overnight = isOvernightShift(input.startTime, input.endTime);
        slots.push({
          slotNumber: g + 1,
          startTime: input.startTime,
          endTime: input.endTime,
          isOvernight: overnight,
          actualEndDate: getActualEndDate(day.date, input.startTime, input.endTime),
          durationHours: calculateShiftDuration(input.startTime, input.endTime),
          assignedGuardUid: null,
        });
      }
      return { date: day.date, slots };
    });
  };

  const currentSchedule = buildShiftSchedule();
  const totalScheduledHours = calculateTotalScheduledHours(currentSchedule);
  const totalDays = daySchedules.length;

  // ─── Validation Helpers ─────────────────────────────────────────────────
  const getSlotValidation = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return null;
    return validateShiftSlot(startTime, endTime);
  };

  const handleLocationSelect = (result: LocationSearchResult) => {
    const coords: Coordinates = { lat: result.lat, lng: result.lng };
    setMapCoords(coords);
    update({
      location: result.address,
      locationCity: result.city,
      locationState: result.state,
      locationCountry: result.country,
      locationPostalCode: result.postalCode,
      coordinates: coords,
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.coordinates;
      return next;
    });
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title?.trim()) e.title = 'Title is required';
      if (!form.description?.trim()) e.description = 'Description is required';
      else if (form.description.length > 2000) e.description = 'Max 2000 characters';
    } else if (step === 1) {
      if (!form.location?.trim()) e.location = 'Address is required';
      if (!form.locationCity?.trim()) e.locationCity = 'City is required';
      if (!mapCoords) e.coordinates = 'Please select a location from the search to set map coordinates';
      if (!form.startDate) e.startDate = 'Start date required';
      if (!form.endDate) e.endDate = 'End date required';
      if (!form.applicationDeadline) e.applicationDeadline = 'Deadline required';

      // Validate all schedule slots
      if (sameEveryDay) {
        const v = getSlotValidation(sharedDayTemplate.startTime, sharedDayTemplate.endTime);
        if (v && !v.valid) e.schedule = v.error || 'Invalid schedule';
      } else {
        for (const day of daySchedules) {
          if (day.sameForAllGuards) {
            const v = getSlotValidation(day.sharedSlot.startTime, day.sharedSlot.endTime);
            if (v && !v.valid) { e.schedule = `${day.date}: ${v.error}`; break; }
          } else {
            for (let g = 0; g < guardsNeeded; g++) {
              const slot = day.guardSlots[g];
              if (slot) {
                const v = getSlotValidation(slot.startTime, slot.endTime);
                if (v && !v.valid) { e.schedule = `${day.date}, Guard ${g + 1}: ${v.error}`; break; }
              }
            }
            if (e.schedule) break;
          }
        }
      }
    } else if (step === 2) {
      if (!form.budgetAmount || form.budgetAmount <= 0) e.budgetAmount = 'Enter a valid budget';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 2)); };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !validateStep()) return;
    setSubmitting(true);
    try {
      const schedule = buildShiftSchedule();
      const payload: CreateJobPayload = {
        ...form as CreateJobPayload,
        coordinates: mapCoords,
        status: asDraft ? JobStatus.DRAFT : JobStatus.OPEN,
        shiftSchedule: schedule,
        totalScheduledHours: calculateTotalScheduledHours(schedule),
      };
      const resp = await createJob(payload);
      if (resp.success && resp.data) {
        setCreatedJobId(resp.data.jobId);
        setShowSuccess(true);
        toast.success(asDraft ? 'Job saved as draft!' : 'Job posted successfully!');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to create job';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.requiredSkills?.includes(s)) {
      update({ requiredSkills: [...(form.requiredSkills || []), s] });
    }
    setSkillInput('');
  };
  const removeSkill = (s: string) => update({ requiredSkills: (form.requiredSkills || []).filter((x) => x !== s) });

  const addLang = () => {
    const l = langInput.trim();
    if (l && !form.preferredLanguages?.includes(l)) {
      update({ preferredLanguages: [...(form.preferredLanguages || []), l] });
    }
    setLangInput('');
  };
  const removeLang = (l: string) => update({ preferredLanguages: (form.preferredLanguages || []).filter((x) => x !== l) });

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors';
  const labelCls = 'text-[11px] font-bold text-[var(--color-input-label)] mb-1.5 block';
  const timeCls = 'px-2 py-1.5 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors w-[100px]';

  const resetForm = () => {
    setStep(0);
    setMapCoords(null);
    setSameEveryDay(true);
    setSharedDayTemplate({ startTime: '08:00', endTime: '18:00' });
    setForm({
      title: '', description: '', jobType: JobType.ONE_TIME,
      isUrgent: false, numberOfGuardsNeeded: 1,
      location: '', locationCity: '', locationState: '', locationCountry: '', locationPostalCode: '',
      coordinates: null,
      startDate: '', endDate: '',
      isFlexibleTime: false, applicationDeadline: '',
      budgetType: BudgetType.HOURLY, budgetAmount: 0, budgetMax: undefined,
      requiredSkills: [], requiredLicenseType: undefined,
      requiresFirstAid: false, requiresWhiteCard: false, requiresChildrenCheck: false,
      minExperience: 0, preferredLanguages: [],
    });
  };

  // ─── Schedule Input Helpers ─────────────────────────────────────────────
  const updateDaySchedule = (index: number, field: 'sharedSlot' | 'sameForAllGuards', value: ScheduleInput | boolean) => {
    setDaySchedules((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const updateGuardSlot = (dayIndex: number, guardIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setDaySchedules((prev) => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      const newSlots = [...d.guardSlots];
      newSlots[guardIndex] = { ...newSlots[guardIndex], [field]: value };
      return { ...d, guardSlots: newSlots };
    }));
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // ─── Time Cell Component ────────────────────────────────────────────────
  const TimeInputCell = ({ startTime, endTime, onStartChange, onEndChange }: {
    startTime: string; endTime: string;
    onStartChange: (v: string) => void; onEndChange: (v: string) => void;
  }) => {
    const overnight = startTime && endTime && isOvernightShift(startTime, endTime);
    const duration = startTime && endTime ? calculateShiftDuration(startTime, endTime) : 0;
    const validation = startTime && endTime ? getSlotValidation(startTime, endTime) : null;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <input type="time" value={startTime} onChange={(e) => onStartChange(e.target.value)} className={timeCls} />
          <span className="text-[9px] text-[var(--color-text-muted)]">to</span>
          <input type="time" value={endTime} onChange={(e) => onEndChange(e.target.value)} className={timeCls} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {overnight && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Moon className="h-2.5 w-2.5" /> Overnight
            </span>
          )}
          {duration > 0 && (
            <span className="text-[9px] font-bold text-[var(--color-text-secondary)]">
              {duration}h
            </span>
          )}
          {validation && !validation.valid && (
            <span className="text-[8px] text-[var(--color-danger)] flex items-center gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" /> {validation.error}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">Post a New Job</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Fill out the details below to find the right security guard.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/boss/jobs')} className="border border-[var(--color-surface-border)]">
            Cancel
          </Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  i === step ? 'bg-[var(--color-primary)] text-white' :
                  i < step ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                  'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
                }`}
              >
                {i < step ? <CheckCircle2 className="h-3 w-3" /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px]">{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-[var(--color-success)]' : 'bg-[var(--color-surface-border)]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Job Basics */}
        {step === 0 && (
          <Card className="p-6 space-y-5">
            <div>
              <label className={labelCls}>Job Title *</label>
              <input value={form.title || ''} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Night Shift Security Guard" className={inputCls} />
              {errors.title && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className={labelCls}>Job Type *</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { val: JobType.ONE_TIME, icon: <Briefcase className="h-5 w-5" />, label: 'One-Time' },
                  { val: JobType.RECURRING, icon: <Repeat className="h-5 w-5" />, label: 'Recurring' },
                  { val: JobType.CONTRACT, icon: <HandshakeIcon className="h-5 w-5" />, label: 'Contract' },
                ]).map(({ val, icon, label }) => (
                  <button key={val} onClick={() => update({ jobType: val })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      form.jobType === val ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] dark:bg-[var(--color-primary)]/10' : 'border-[var(--color-surface-border)] hover:border-[var(--color-primary)]/50'
                    }`}>
                    <span className={form.jobType === val ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}>{icon}</span>
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-input-label)] mb-1.5 flex items-center justify-between">
                Description * <span className={`text-[9px] ${(form.description?.length || 0) > 2000 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>{form.description?.length || 0}/2000</span>
              </label>
              <textarea value={form.description || ''} onChange={(e) => update({ description: e.target.value })} rows={6} maxLength={2000} placeholder="Describe the role, responsibilities, and any important details..." className={`${inputCls} resize-none`} />
              {errors.description && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.description}</p>}
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Toggle checked={form.isUrgent || false} onCheckedChange={(v) => update({ isUrgent: v })} />
                <span className="text-xs font-bold text-[var(--color-text-secondary)] flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-[var(--color-danger)]" /> Mark as Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5 inline mr-1" />Guards needed:</label>
                <input type="number" min={1} max={50} value={form.numberOfGuardsNeeded || 1} onChange={(e) => update({ numberOfGuardsNeeded: Math.max(1, Number(e.target.value)) })} className={`${inputCls} w-20 text-center`} />
              </div>
            </div>
          </Card>
        )}

        {/* Step 2 — Location & Schedule */}
        {step === 1 && (
          <Card className="p-6 space-y-5">
            {/* Location Search */}
            <LocationSearch
              label="Job Location *"
              placeholder="Search for a job location address..."
              defaultValue={form.location || ''}
              onLocationSelect={handleLocationSelect}
              error={errors.coordinates}
            />

            {/* Map Preview */}
            {mapCoords && (
              <div className="rounded-xl overflow-hidden border border-[var(--color-surface-border)]">
                <MapDisplay
                  center={mapCoords}
                  zoom={15}
                  height="300px"
                  interactive={true}
                  markers={[{
                    lat: mapCoords.lat,
                    lng: mapCoords.lng,
                    title: form.title || 'Job Location',
                    jobId: 'new',
                    budget: form.budgetAmount || 0,
                    budgetType: form.budgetType || 'HOURLY',
                    status: 'OPEN',
                    isUrgent: form.isUrgent || false,
                    onClick: () => {},
                  }]}
                />
              </div>
            )}

            {/* Address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Full Address *</label>
                <input value={form.location || ''} onChange={(e) => update({ location: e.target.value })} placeholder="123 High Street" className={inputCls} />
                {errors.location && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.location}</p>}
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input value={form.locationCity || ''} onChange={(e) => update({ locationCity: e.target.value })} placeholder="London" className={inputCls} />
                {errors.locationCity && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.locationCity}</p>}
              </div>
              <div><label className={labelCls}>State / County</label><input value={form.locationState || ''} onChange={(e) => update({ locationState: e.target.value })} placeholder="Greater London" className={inputCls} /></div>
              <div><label className={labelCls}>Country</label><input value={form.locationCountry || ''} onChange={(e) => update({ locationCountry: e.target.value })} placeholder="United Kingdom" className={inputCls} /></div>
              <div><label className={labelCls}>Postal Code</label><input value={form.locationPostalCode || ''} onChange={(e) => update({ locationPostalCode: e.target.value })} placeholder="EC2A 1NT" className={inputCls} /></div>
            </div>

            {/* Date Selection */}
            <div className="border-t border-[var(--color-surface-border)] pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Start Date *</label><input type="date" value={form.startDate || ''} onChange={(e) => update({ startDate: e.target.value })} className={inputCls} />{errors.startDate && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.startDate}</p>}</div>
              <div><label className={labelCls}>End Date *</label><input type="date" value={form.endDate || ''} onChange={(e) => update({ endDate: e.target.value })} className={inputCls} />{errors.endDate && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.endDate}</p>}</div>
            </div>

            {/* ─── Shift Schedule Builder ──────────────────────────────────── */}
            {daySchedules.length > 0 && (
              <div className="border-t border-[var(--color-surface-border)] pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                    Shift Schedule
                  </h3>
                  <div className="flex items-center gap-3">
                    <Toggle checked={sameEveryDay} onCheckedChange={setSameEveryDay} />
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Same schedule every day</span>
                  </div>
                </div>

                {/* Same every day mode */}
                {sameEveryDay ? (
                  <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
                      Applied to all {totalDays} day{totalDays > 1 ? 's' : ''} {guardsNeeded > 1 ? `• ${guardsNeeded} guards` : ''}
                    </p>
                    <TimeInputCell
                      startTime={sharedDayTemplate.startTime}
                      endTime={sharedDayTemplate.endTime}
                      onStartChange={(v) => setSharedDayTemplate((p) => ({ ...p, startTime: v }))}
                      onEndChange={(v) => setSharedDayTemplate((p) => ({ ...p, endTime: v }))}
                    />
                  </div>
                ) : (
                  /* Per-day mode */
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {daySchedules.map((day, di) => (
                      <div key={day.date} className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--color-text-primary)]">
                            {formatDateLabel(day.date)}
                          </span>
                          {guardsNeeded > 1 && (
                            <div className="flex items-center gap-2">
                              <Toggle
                                checked={day.sameForAllGuards}
                                onCheckedChange={(v) => updateDaySchedule(di, 'sameForAllGuards', v)}
                              />
                              <span className="text-[9px] font-bold text-[var(--color-text-muted)]">Same for all guards</span>
                            </div>
                          )}
                        </div>

                        {day.sameForAllGuards || guardsNeeded === 1 ? (
                          <TimeInputCell
                            startTime={day.sharedSlot.startTime}
                            endTime={day.sharedSlot.endTime}
                            onStartChange={(v) => updateDaySchedule(di, 'sharedSlot', { ...day.sharedSlot, startTime: v })}
                            onEndChange={(v) => updateDaySchedule(di, 'sharedSlot', { ...day.sharedSlot, endTime: v })}
                          />
                        ) : (
                          <div className="space-y-2">
                            {Array.from({ length: guardsNeeded }, (_, g) => (
                              <div key={g} className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] w-16 shrink-0">Guard {g + 1}</span>
                                <TimeInputCell
                                  startTime={day.guardSlots[g]?.startTime || '08:00'}
                                  endTime={day.guardSlots[g]?.endTime || '18:00'}
                                  onStartChange={(v) => updateGuardSlot(di, g, 'startTime', v)}
                                  onEndChange={(v) => updateGuardSlot(di, g, 'endTime', v)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Schedule Summary */}
                <div className="mt-4 p-3 rounded-xl bg-[var(--color-primary-light)] dark:bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                  <p className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Total scheduled hours: {totalScheduledHours} hrs across {totalDays} day{totalDays > 1 ? 's' : ''} for {guardsNeeded} guard{guardsNeeded > 1 ? 's' : ''}
                  </p>
                </div>

                {errors.schedule && (
                  <p className="text-[10px] text-[var(--color-danger)] mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {errors.schedule}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Toggle checked={form.isFlexibleTime || false} onCheckedChange={(v) => update({ isFlexibleTime: v })} />
                <span className="text-xs font-bold text-[var(--color-text-secondary)]"><Clock className="h-3.5 w-3.5 inline mr-1" />Flexible Time</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>Application Deadline *</label>
              <input type="date" value={form.applicationDeadline || ''} onChange={(e) => update({ applicationDeadline: e.target.value })} className={`${inputCls} max-w-xs`} />
              {errors.applicationDeadline && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.applicationDeadline}</p>}
            </div>
          </Card>
        )}

        {/* Step 3 — Requirements & Budget */}
        {step === 2 && (
          <Card className="p-6 space-y-5">
            <div>
              <label className={labelCls}>Budget Type</label>
              <div className="flex gap-3">
                {[BudgetType.HOURLY, BudgetType.FIXED].map((t) => (
                  <button key={t} onClick={() => update({ budgetType: t })}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${form.budgetType === t ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:bg-[var(--color-primary)]/10' : 'border-[var(--color-surface-border)] text-[var(--color-text-muted)]'}`}>
                    {t === BudgetType.HOURLY ? '£/Hour' : '£ Fixed'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Budget Amount (£) *</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-bold">£</span>
                <input type="number" min={0} step="0.01" value={form.budgetAmount || ''} onChange={(e) => update({ budgetAmount: Number(e.target.value) })} className={`${inputCls} pl-8`} /></div>
                {errors.budgetAmount && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.budgetAmount}</p>}
              </div>
              <div>
                <label className={labelCls}>Max Budget (optional)</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-bold">£</span>
                <input type="number" min={0} step="0.01" value={form.budgetMax ?? ''} onChange={(e) => update({ budgetMax: e.target.value ? Number(e.target.value) : undefined })} className={`${inputCls} pl-8`} placeholder="—" /></div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Required Skills</label>
              <div className="flex gap-2 mb-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" className={`${inputCls} flex-1`} />
                <Button size="sm" variant="ghost" onClick={addSkill} className="border border-[var(--color-surface-border)]"><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5">{(form.requiredSkills || []).map((s) => (<span key={s} className="text-[9px] font-bold px-2 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center gap-1 dark:bg-[var(--color-primary)]/10">{s}<button onClick={() => removeSkill(s)}><X className="h-2.5 w-2.5" /></button></span>))}</div>
            </div>

            <div>
              <label className={labelCls}>Required License Type</label>
              <select value={form.requiredLicenseType || ''} onChange={(e) => update({ requiredLicenseType: e.target.value || undefined })} className={inputCls}>
                <option value="">None</option>
                {LICENSE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3"><Toggle checked={form.requiresFirstAid || false} onCheckedChange={(v) => update({ requiresFirstAid: v })} /><span className="text-xs font-bold text-[var(--color-text-secondary)]">First Aid</span></div>
              <div className="flex items-center gap-3"><Toggle checked={form.requiresWhiteCard || false} onCheckedChange={(v) => update({ requiresWhiteCard: v })} /><span className="text-xs font-bold text-[var(--color-text-secondary)]">White Card</span></div>
              <div className="flex items-center gap-3"><Toggle checked={form.requiresChildrenCheck || false} onCheckedChange={(v) => update({ requiresChildrenCheck: v })} /><span className="text-xs font-bold text-[var(--color-text-secondary)]">Children Check</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Min Experience (years)</label><input type="number" min={0} value={form.minExperience || 0} onChange={(e) => update({ minExperience: Number(e.target.value) })} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Preferred Languages</label>
                <div className="flex gap-2">
                  <input value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLang(); } }} placeholder="e.g. English" className={`${inputCls} flex-1`} />
                  <Button size="sm" variant="ghost" onClick={addLang} className="border border-[var(--color-surface-border)]"><Plus className="h-3 w-3" /></Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">{(form.preferredLanguages || []).map((l) => (<span key={l} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] flex items-center gap-1">{l}<button onClick={() => removeLang(l)}><X className="h-2.5 w-2.5" /></button></span>))}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={step === 0} leftIcon={<ChevronLeft className="h-4 w-4" />} className="border border-[var(--color-surface-border)]">
            Back
          </Button>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button variant="ghost" size="sm" onClick={() => handleSubmit(true)} disabled={submitting} className="border border-[var(--color-surface-border)]">
                Save as Draft
              </Button>
            )}
            {step < 2 ? (
              <Button size="sm" onClick={handleNext} rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button>
            ) : (
              <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitting} leftIcon={<CheckCircle2 className="h-4 w-4" />} className="shadow-md shadow-[var(--color-primary)]/10">
                {submitting ? 'Posting...' : 'Post Job'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); router.push('/dashboard/boss/jobs'); }} title="Job Posted!" size="sm">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-success-light)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-success)]" />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">Your job has been posted and is now visible to guards.</p>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" className="flex-1 border border-[var(--color-surface-border)]" onClick={() => { setShowSuccess(false); router.push(`/dashboard/boss/jobs/${createdJobId}`); }}>View Job</Button>
            <Button size="sm" className="flex-1" onClick={() => { setShowSuccess(false); resetForm(); }}>Post Another Job</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
