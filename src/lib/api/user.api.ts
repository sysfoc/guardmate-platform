/**
 * user.api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend wrappers for generic Account Profile logic.
 * Encompasses hitting MongoDB mapping to the current active session.
 */

import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { UserProfile, ProfileUpdatePayload, MateProfile } from '@/types/user.types';
import type { AustralianState } from '@/types/abr.types';

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Fetches an arbitrary UserProfile remotely by their unique `uid`.
 */
export async function getUserProfile(uid: string): Promise<ApiResponse<UserProfile>> {
  return apiGet<UserProfile>(`/api/users/${uid}`);
}

/**
 * Pushes updates to the MongoDB Document mapping via strict profile payload structure.
 */
export async function updateUserProfile(payload: Partial<ProfileUpdatePayload>): Promise<ApiResponse<UserProfile>> {
  return apiPatch<UserProfile>(`/api/users/me`, payload);
}

/**
 * Uploads a raw `File` boundary object against the photo upload endpoint.
 */
export async function uploadProfilePhoto(file: File): Promise<ApiResponse<{ url: string }>> {
  const formData = new FormData();
  formData.append('file', file);

  return apiPost<{ url: string }>('/api/users/me/photo', formData);
}

/**
 * Uploads a document file (PDF, image) for the current user.
 * @param file - The document file to upload
 * @param type - Document type: 'license' | 'id' | 'companyLicense'
 */
export async function uploadDocument(
  file: File,
  type: 'license' | 'id' | 'companyLicense' | 'firstAid' | 'whiteCard' | 'childrenCheck' | 'victorianBusinessLicence'
): Promise<ApiResponse<{ url: string; field: string }>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  return apiPost<{ url: string; field: string }>('/api/upload/document', formData);
}

/**
 * Verifies an ABN with the Australian Business Register (ABR) API.
 * @param abn - The ABN to verify (11 digits)
 * @param abnState - The Australian state where the guard primarily operates
 * @returns Updated Mate profile with ABN verification details
 */
export async function verifyABN(
  abn: string,
  abnState: AustralianState
): Promise<ApiResponse<Partial<MateProfile>>> {
  return apiPost<Partial<MateProfile>>('/api/mate/verify-abn', { abn, abnState });
}
