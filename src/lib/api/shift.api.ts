/**
 * shift.api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side API helpers for the Shift & Incident Reporting system.
 * All calls go through apiClient.ts. Fully typed with JSDoc.
 */

import { apiGet, apiPost } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type {
  IShift,
  IIncidentReport,
  CheckInPayload,
  CheckOutPayload,
  LocationUpdatePayload,
  SubmitIncidentPayload,
} from '@/types/shift.types';

// ─── Shift Endpoints ──────────────────────────────────────────────────────────

/**
 * Check in to a shift (Mate only).
 * @param jobId - The job to check in to
 * @param payload - GPS coordinates of the guard
 */
export async function checkIn(jobId: string, payload: CheckInPayload): Promise<ApiResponse<IShift>> {
  return apiPost<IShift>(`/api/shifts/${jobId}/checkin`, payload);
}

/**
 * Check out from a shift (Mate only).
 * @param jobId - The job to check out from
 * @param payload - GPS coordinates of the guard
 */
export async function checkOut(jobId: string, payload: CheckOutPayload): Promise<ApiResponse<IShift>> {
  return apiPost<IShift>(`/api/shifts/${jobId}/checkout`, payload);
}

/**
 * Send a live location update during a shift (Mate only).
 * @param jobId - The active job
 * @param payload - GPS coordinates and timestamp
 */
export async function updateLocation(jobId: string, payload: LocationUpdatePayload): Promise<ApiResponse<null>> {
  return apiPost<null>(`/api/shifts/${jobId}/location`, payload);
}

export interface GetShiftResponse {
  todayShift: IShift | null;
  allShifts: IShift[];
  totalHoursAllDays: number;
}

/**
 * Get the shift documents for a job (authenticated participant).
 * Returns today's active shift and history of all shifts.
 * @param jobId - The job to get shift data for
 */
export async function getShift(jobId: string): Promise<ApiResponse<GetShiftResponse>> {
  console.log('[DEBUG CLIENT] getShift called with jobId:', jobId);
  const result = await apiGet<GetShiftResponse>(`/api/shifts/${jobId}`);
  console.log('[DEBUG CLIENT] getShift response:', result);
  return result;
}

/**
 * Approve one or all completed shifts for a job (Boss only).
 * @param jobId - The job whose shift to approve
 * @param payload - Optional shiftId to approve a specific day
 */
export async function approveShift(jobId: string, payload?: { shiftId?: string }): Promise<ApiResponse<{ approvedCount: number; jobStatus: string }>> {
  return apiPost<{ approvedCount: number; jobStatus: string }>(`/api/shifts/${jobId}/approve`, payload || {});
}

// ─── Incident Endpoints ───────────────────────────────────────────────────────

/**
 * Submit an incident report (Mate only).
 * @param payload - Incident report data
 */
export async function submitIncidentReport(payload: SubmitIncidentPayload): Promise<ApiResponse<IIncidentReport>> {
  return apiPost<IIncidentReport>(`/api/shifts/${payload.jobId}/incident`, payload);
}

/**
 * Get all incident reports for a specific job (participant only).
 * @param jobId - The job to get incidents for
 */
export async function getIncidentReports(jobId: string): Promise<ApiResponse<IIncidentReport[]>> {
  return apiGet<IIncidentReport[]>(`/api/shifts/${jobId}/incident`);
}

/**
 * Get all incident reports submitted by the current guard (Mate only).
 * @param page - Page number for pagination
 */
export async function getMyIncidentReports(page: number = 1): Promise<ApiResponse<{ incidents: IIncidentReport[]; total: number }>> {
  return apiGet<{ incidents: IIncidentReport[]; total: number }>(`/api/shifts/my-incidents?page=${page}`);
}
