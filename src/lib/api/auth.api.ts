/**
 * auth.api.ts — FIXED
 *
 * Key fixes:
 * 1. registerUser() now works because AuthContext sets the cookie BEFORE calling this
 * 2. googleSignIn() properly chains Firebase popup → token cookie → backend sync
 * 3. All functions rely on apiClient which reads the __session cookie via getFirebaseIdToken
 * 4. assignRole() exported for Google new-user flow in RegisterPage
 */

import { apiPost, apiGet } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { UserProfile } from '@/types/user.types';
import type { UserRole } from '@/types/enums';
import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser as firebaseSignOutUser,
  sendPasswordReset,
} from '@/lib/firebase/firebaseAuth';
import { auth } from '@/lib/firebase/firebaseClient';
import Cookies from 'js-cookie';

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  role: UserRole;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
}

export interface AssignRolePayload {
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

// ─── Register (Email Flow) ────────────────────────────────────────────────────

/**
 * Creates the MongoDB user document.
 * IMPORTANT: Must be called AFTER Firebase user is created and token is in cookie.
 * AuthContext.register() handles this sequencing correctly.
 */
export async function registerUser(payload: RegisterPayload): Promise<ApiResponse<UserProfile>> {
  return apiPost<UserProfile>('/api/auth/register', payload);
}

// ─── Google Sign In ───────────────────────────────────────────────────────────

/**
 * Full Google sign-in flow:
 * 1. Opens Google OAuth popup via Firebase
 * 2. Gets fresh ID token
 * 3. Stores token in cookie
 * 4. Hits /api/auth/google to sync with MongoDB
 * Returns { isNewUser: boolean, user?: UserProfile }
 */
export async function googleSignIn(): Promise<ApiResponse<{ isNewUser: boolean; user?: UserProfile }>> {
  // Step 1: Firebase Google popup
  const firebaseResult = await firebaseSignInWithGoogle();
  if (firebaseResult.error || !firebaseResult.user) {
    throw new Error(firebaseResult.error || 'Google sign-in failed.');
  }

  // Step 2: Get fresh token and store in cookie so apiClient can attach it
  const token = await firebaseResult.user.getIdToken(true);
  Cookies.set('__session', token, {
    expires: 14,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // Step 3: Sync with MongoDB backend
  return apiPost<{ isNewUser: boolean; user?: UserProfile }>('/api/auth/google', {});
}

// ─── Assign Role (Google New User) ────────────────────────────────────────────

/**
 * Called after Google sign-in when isNewUser = true.
 * Creates the MongoDB document with the chosen role.
 * Firebase user already exists at this point.
 */
export async function assignRole(payload: AssignRolePayload): Promise<ApiResponse<UserProfile>> {
  return apiPost<UserProfile>('/api/auth/assign-role', payload);
}

// ─── Get Current User ─────────────────────────────────────────────────────────

/**
 * Fetches the fully hydrated MongoDB UserProfile for the current session.
 */
export async function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  return apiGet<UserProfile>('/api/auth/me');
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Signs out of Firebase and calls backend logout.
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOutUser();
  // Best-effort backend logout (clears server-side session if any)
  try {
    await apiPost<null>('/api/auth/logout', {});
  } catch (e) {
    // Non-fatal — cookie removal in AuthContext handles the rest
    console.warn('Backend logout failed (non-fatal):', e);
  }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

/**
 * Sends a password reset email via Firebase.
 */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<ApiResponse<null>> {
  await sendPasswordReset(payload.email);
  return { success: true, message: 'Password reset email sent.', data: null, statusCode: 200 };
}

// ─── Update Login Metadata ────────────────────────────────────────────────────

/**
 * Passive fire-and-forget tracker that appends login history to MongoDB.
 * Called after successful sign-in.
 */
export async function updateLoginMeta(): Promise<void> {
  await apiPost<null>('/api/auth/update-login-meta', {});
}