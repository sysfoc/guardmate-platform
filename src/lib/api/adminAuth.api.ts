/**
 * adminAuth.api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side API functions for admin authentication system.
 * Separate from the regular auth flow — used by admin login/register pages.
 */

import { apiGet, apiPost } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminLoginResponse {
  otpSent: boolean;
  email: string;
  expiresIn: number;
}

export interface AdminVerifyOtpResponse {
  customToken: string;
  user: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    adminLevel: string;
    profilePhoto: string | null;
  };
}

export interface AdminRegisterResponse {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AdminInviteResponse {
  email: string;
  expiresAt: string;
}

export interface AdminManagementData {
  pendingInvites: {
    id: string;
    email: string;
    invitedByName: string;
    expiresAt: string;
    createdAt: string;
  }[];
  usedInvites: {
    id: string;
    email: string;
    invitedByName: string;
    usedAt: string;
    createdAt: string;
  }[];
  admins: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    adminLevel: string;
    profilePhoto: string | null;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
  }[];
}

// ─── Admin Login (Step 1: Send OTP) ───────────────────────────────────────────

export async function adminLogin(
  email: string,
  password: string
): Promise<ApiResponse<AdminLoginResponse>> {
  return apiPost<AdminLoginResponse>('/api/admin/auth/login', { email, password });
}

// ─── Admin Verify OTP (Step 2: Complete Login) ────────────────────────────────

export async function adminVerifyOtp(
  email: string,
  code: string
): Promise<ApiResponse<AdminVerifyOtpResponse>> {
  return apiPost<AdminVerifyOtpResponse>('/api/admin/auth/verify-otp', { email, code });
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────

export async function adminResendOtp(
  email: string
): Promise<ApiResponse<{ otpSent: boolean; expiresIn: number }>> {
  return apiPost<{ otpSent: boolean; expiresIn: number }>('/api/admin/auth/send-otp', { email });
}

// ─── Admin Register (Invite-Only) ─────────────────────────────────────────────

export async function adminRegister(
  token: string,
  firstName: string,
  lastName: string,
  password: string
): Promise<ApiResponse<AdminRegisterResponse>> {
  return apiPost<AdminRegisterResponse>('/api/admin/auth/register', {
    token,
    firstName,
    lastName,
    password,
  });
}

// ─── Send Admin Invite (SUPER admins only) ────────────────────────────────────

export async function sendAdminInvite(
  email: string
): Promise<ApiResponse<AdminInviteResponse>> {
  return apiPost<AdminInviteResponse>('/api/admin/auth/invite', { email });
}

// ─── Get Admin Management Data (SUPER admins only) ────────────────────────────

export async function getAdminManagement(): Promise<ApiResponse<AdminManagementData>> {
  return apiGet<AdminManagementData>('/api/admin/auth/invites');
}
