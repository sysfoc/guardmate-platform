// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Auth Payload & Response Types
// ─────────────────────────────────────────────────────────────────────────────

import type { UserRole } from './enums';
import type { UserProfile } from './user.types';

// ─── Registration ─────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryCode: string;
  /** Only BOSS or MATE allowed during self-registration */
  role: UserRole.BOSS | UserRole.MATE;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

// ─── Google Auth ──────────────────────────────────────────────────────────────

export interface GoogleAuthPayload {
  idToken: string;
  /** Required only when registering a new user via Google */
  role?: UserRole.BOSS | UserRole.MATE;
}

// ─── Role Assignment (post Google sign-up) ────────────────────────────────────

export interface AssignRolePayload {
  role: UserRole.BOSS | UserRole.MATE;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryCode: string;
}

// ─── Password Recovery ────────────────────────────────────────────────────────

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export interface OTPVerifyPayload {
  /** Email address or phone number */
  identifier: string;
  otp: string;
  type: 'email' | 'phone';
}

export interface OTPResponse {
  success: boolean;
  message: string;
  /** Seconds until OTP expires */
  expiresIn: number;
}

// ─── Auth Response ────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  /** True when the account was just created (first sign-in) */
  isNewUser: boolean;
}
