// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Shift Calculation Utilities
// Single source of truth for ALL shift time arithmetic.
// ─────────────────────────────────────────────────────────────────────────────

import type { ShiftScheduleDay } from '@/types/job.types';

// ─── Time Parsing ─────────────────────────────────────────────────────────────

function parseHHmm(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number);
  return { hours: h, minutes: m };
}

function toMinutes(time: string): number {
  const { hours, minutes } = parseHHmm(time);
  return hours * 60 + minutes;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Returns true if a shift is overnight (endTime <= startTime).
 * e.g. 22:00 → 02:00 = overnight.
 */
export function isOvernightShift(startTime: string, endTime: string): boolean {
  return toMinutes(endTime) <= toMinutes(startTime);
}

/**
 * Calculate shift duration in hours (decimal).
 * Handles overnight shifts by adding 24h to endTime when end <= start.
 * Never returns negative.
 */
export function calculateShiftDuration(startTime: string, endTime: string): number {
  const startMin = toMinutes(startTime);
  let endMin = toMinutes(endTime);
  if (endMin <= startMin) endMin += 24 * 60;
  const durationHours = (endMin - startMin) / 60;
  return Math.round(durationHours * 100) / 100;
}

/**
 * Return the actual end date (ISO YYYY-MM-DD).
 * If overnight, returns the next calendar day; otherwise returns same date.
 */
export function getActualEndDate(date: string, startTime: string, endTime: string): string {
  if (isOvernightShift(startTime, endTime)) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  return date;
}

/**
 * Sum all slot durations across all days.
 */
export function calculateTotalScheduledHours(shiftSchedule: ShiftScheduleDay[]): number {
  let total = 0;
  for (const day of shiftSchedule) {
    for (const slot of day.slots) {
      total += slot.durationHours;
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Human-readable shift display string.
 * e.g. "Mon 1 Apr, 22:00 - 02:00 (+1 day)" or "Mon 1 Apr, 08:00 - 17:00"
 */
export function formatShiftDisplay(
  date: string,
  startTime: string,
  endTime: string,
  isOvernight: boolean
): string {
  const d = new Date(date + 'T00:00:00');
  const formatted = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const suffix = isOvernight ? ' (+1 day)' : '';
  return `${formatted}, ${startTime} - ${endTime}${suffix}`;
}

/**
 * Validate a shift slot's start/end times.
 * - Must be valid HH:mm format
 * - Duration must be at least 1 hour and at most 24 hours
 * - Start and end cannot be exactly equal
 */
export function validateShiftSlot(
  startTime: string,
  endTime: string
): { valid: boolean; error?: string } {
  const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!hhmmRegex.test(startTime)) {
    return { valid: false, error: 'Start time must be in HH:mm format (00:00 - 23:59)' };
  }
  if (!hhmmRegex.test(endTime)) {
    return { valid: false, error: 'End time must be in HH:mm format (00:00 - 23:59)' };
  }
  if (startTime === endTime) {
    return { valid: false, error: 'Start time and end time cannot be the same' };
  }
  const duration = calculateShiftDuration(startTime, endTime);
  if (duration < 1) {
    return { valid: false, error: 'Shift must be at least 1 hour long' };
  }
  if (duration > 24) {
    return { valid: false, error: 'Shift cannot exceed 24 hours' };
  }
  return { valid: true };
}

/**
 * Generate an array of ISO date strings (YYYY-MM-DD) from startDate to endDate inclusive.
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Check if two time ranges overlap on the same day.
 * Handles overnight shifts. Returns true if they overlap.
 */
export function doSlotsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  let aStartMin = toMinutes(aStart);
  let aEndMin = toMinutes(aEnd);
  let bStartMin = toMinutes(bStart);
  let bEndMin = toMinutes(bEnd);

  // Normalize overnight shifts
  if (aEndMin <= aStartMin) aEndMin += 24 * 60;
  if (bEndMin <= bStartMin) bEndMin += 24 * 60;

  return aStartMin < bEndMin && bStartMin < aEndMin;
}
