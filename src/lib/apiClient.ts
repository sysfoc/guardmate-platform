/**
 * apiClient.ts -- FIXED
 *
 * Key fixes:
 * 1. 401 on /api/auth/me does NOT redirect -- it fires on every unauthenticated
 *    page load and UserContext handles it. Redirecting here caused an infinite loop.
 * 2. 401 on other routes redirects to /login (correct path, not /auth/login).
 * 3. getAuthToken() reads from Firebase SDK first, cookie as fallback.
 * 4. Removed dependency on ROUTES constant to avoid stale import issues.
 */

import type { ApiResponse, ApiRequestError } from '@/types/api.types';
import { toast } from 'react-hot-toast';

// Build absolute URL from env
function buildUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined in your environment.');
  }
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

// Get current Firebase ID token, fallback to cookie
async function getAuthToken(): Promise<string | null> {
  try {
    const { auth } = await import('./firebase/firebaseClient');
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken(false);
    }
  } catch (e) {
    console.warn('apiClient: could not get Firebase token:', e);
  }

  // Fallback: read __session cookie (set by AuthContext on login)
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)__session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  return null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth token for public endpoints */
  public?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    public: isPublic = false,
  } = options;

  const headers: Record<string, string> = {
    ...extraHeaders,
  };

  // Only set application/json if body is NOT FormData
  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!isPublic) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (networkError: any) {
    const error: ApiRequestError = {
      success: false,
      message: 'Network error -- please check your connection.',
      statusCode: 0,
    };
    throw error;
  }

  // Handle 401
  if (response.status === 401) {
    // Clear cookies
    if (typeof document !== 'undefined') {
      document.cookie = '__session=; Max-Age=0; path=/';
      document.cookie = '__role=; Max-Age=0; path=/';
    }

    // IMPORTANT: Do NOT redirect for /api/auth/me.
    // This endpoint returns 401 on every unauthenticated page load -- that is normal.
    // UserContext catches this error and sets needsRoleAssignment or clears user state.
    // Redirecting here creates an infinite loop:
    //   /api/auth/me 401 -> redirect /login -> page loads -> /api/auth/me 401 -> ...
    //
    // Only redirect for mid-session expiry on protected actions.
    const isPassiveCheck = path.includes('/api/auth/me');

    if (!isPassiveCheck && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const onAuthPage = ['/login', '/register', '/forgot-password', '/verify-email'].some(
        (p) => currentPath.startsWith(p)
      );
      if (!onAuthPage) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }

    const error: ApiRequestError = {
      success: false,
      message: 'Session expired. Please log in again.',
      statusCode: 401,
    };
    throw error;
  }

  // Parse JSON
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    const error: ApiRequestError = {
      success: false,
      message: 'Server returned an invalid response.',
      statusCode: response.status,
    };
    throw error;
  }

  // Handle non-2xx
  if (!response.ok) {
    const apiErr = payload as Partial<ApiRequestError>;
    const error: ApiRequestError = {
      success: false,
      message: apiErr.message ?? `Request failed with status ${response.status}.`,
      statusCode: response.status,
      errors: apiErr.errors,
    };
    throw error;
  }

  return payload as ApiResponse<T>;
}

// Convenience methods
export const apiGet = <T>(
  path: string,
  opts?: Omit<RequestOptions, 'method' | 'body'>
) => apiRequest<T>(path, { ...opts, method: 'GET' });

export const apiPost = <T>(
  path: string,
  body: unknown,
  opts?: Omit<RequestOptions, 'method'>
) => apiRequest<T>(path, { ...opts, method: 'POST', body });

export const apiPut = <T>(
  path: string,
  body: unknown,
  opts?: Omit<RequestOptions, 'method'>
) => apiRequest<T>(path, { ...opts, method: 'PUT', body });

export const apiPatch = <T>(
  path: string,
  body: unknown,
  opts?: Omit<RequestOptions, 'method'>
) => apiRequest<T>(path, { ...opts, method: 'PATCH', body });

export const apiDelete = <T>(
  path: string,
  opts?: Omit<RequestOptions, 'method' | 'body'>
) => apiRequest<T>(path, { ...opts, method: 'DELETE' });