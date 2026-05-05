// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Generic API Response Types
// ─────────────────────────────────────────────────────────────────────────────

import { LockReason } from '@/types/enums';
import { IMessage } from '@/types/chat.types';

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  /** Human-readable error message */
  message: string;
  /** Machine-readable error code, e.g. "AUTH_INVALID_TOKEN" */
  code: string;
  /** Field name when the error relates to a specific input */
  field?: string;
  /** Stack trace — populated only in development environments */
  stack?: string;
}

// ─── API Request Error ────────────────────────────────────────────────────────

export interface ApiRequestError {
  success: boolean;
  message: string;
  statusCode: number;
  errors?: ApiError[];
}

// ─── Generic API Response ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: ApiError[];
  statusCode: number;
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Messages Paginated Response (includes conversation lock state) ───────────

export interface MessagesPaginatedResponse extends PaginatedResponse<IMessage> {
  isLocked: boolean;
  lockedAt: Date | string | null;
  lockReason: LockReason | null;
}

// ─── Paginated API Response ───────────────────────────────────────────────────

export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;
