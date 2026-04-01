// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Shift & Incident Report Types
// ─────────────────────────────────────────────────────────────────────────────

import { IncidentType, IncidentSeverity } from './enums';

export { IncidentType, IncidentSeverity };

// ─── Coordinates ──────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

// ─── Location Entry ───────────────────────────────────────────────────────────

export interface LocationEntry {
  lat: number;
  lng: number;
  timestamp: string | Date;
}

// ─── Shift Status ─────────────────────────────────────────────────────────────

export enum ShiftStatus {
  NOT_STARTED = 'NOT_STARTED',
  CHECKED_IN  = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  APPROVED    = 'APPROVED',
}

// ─── IShift ───────────────────────────────────────────────────────────────────

export interface IShift {
  _id?: string;
  jobId: string;
  shiftDate: string | Date;
  guardUid: string;
  bossUid: string;

  jobTitle: string;
  jobLocation: string;
  jobCoordinates: Coordinates | null;

  // Check-in
  checkInTime: string | Date | null;
  checkInCoordinates: Coordinates | null;
  checkInDistance: number | null;
  checkInVerified: boolean;

  // Check-out
  checkOutTime: string | Date | null;
  checkOutCoordinates: Coordinates | null;
  totalHoursWorked: number | null;

  // Live Tracking
  locationHistory: LocationEntry[];

  // Boss Approval
  isApprovedByBoss: boolean;
  approvedAt: string | Date | null;
  approvedBy: string | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ─── IIncidentReport ──────────────────────────────────────────────────────────

export interface IIncidentReport {
  _id?: string;
  jobId: string;
  shiftId: string;
  guardUid: string;
  guardName: string;
  bossUid: string;
  jobTitle: string;

  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location: string | null;

  document: string | null;
  photos: string[];

  isReviewedByBoss: boolean;
  isReviewedByAdmin: boolean;
  bossReviewedAt: string | Date | null;
  adminReviewedAt: string | Date | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CheckInPayload {
  coordinates: Coordinates;
  /** Client's timezone offset in minutes (from Date.getTimezoneOffset()). */
  timezoneOffset?: number;
}

export interface CheckOutPayload {
  coordinates: Coordinates;
}

export interface LocationUpdatePayload {
  coordinates: Coordinates;
  timestamp: string;
}

export interface SubmitIncidentPayload {
  jobId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location?: string;
  document?: string;
  photos?: string[];
}
