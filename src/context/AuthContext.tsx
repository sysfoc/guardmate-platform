'use client';

/**
 * AuthContext.tsx — TS Error Cleanup
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Unsubscribe } from 'firebase/auth';
import Cookies from 'js-cookie';
import { UserRole, UserStatus } from '@/types/enums';
import {
  onAuthChange,
  signInWithEmail,
  registerWithEmail,
  signOutUser,
  reloadCurrentUser,
  sendEmailVerification,
} from '@/lib/firebase/firebaseAuth';
import {
  googleSignIn as apiGoogleSignIn,
  updateLoginMeta,
  registerUser,
  getCurrentUser,
  type RegisterPayload,
} from '@/lib/api/auth.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  firebaseUser: User | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<{ isNewUser: boolean }>;
  register: (payload: RegisterPayload, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    let unmounted = false;

    const unsubscribe: Unsubscribe = onAuthChange(async (user) => {
      if (user) {
        try {
          // By default, onAuthChange refreshes use a 14-day token if session exists
          const token = await user.getIdToken(true);
          const isPersisted = Cookies.get('__persisted') === 'true';
          const currentRole = Cookies.get('__role');
          const currentStatus = Cookies.get('__status');
          
          const cookieOptions: Cookies.CookieAttributes = {
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          };
          
          if (isPersisted) {
            cookieOptions.expires = 14; 
          }

          Cookies.set('__session', token, cookieOptions);
          if (currentRole) Cookies.set('__role', currentRole, cookieOptions);
          if (currentStatus) Cookies.set('__status', currentStatus, cookieOptions);
        } catch (e) {
          console.error('Failed to get fresh token:', e);
        }
        if (!unmounted) setFirebaseUser(user);
      } else {
        Cookies.remove('__session');
        Cookies.remove('__role');
        Cookies.remove('__status');
        Cookies.remove('__persisted');
        Cookies.remove('__onboarding_complete');
        if (!unmounted) setFirebaseUser(null);
      }
      if (!unmounted) setLoading(false);
    });

    return () => {
      unmounted = true;
      unsubscribe();
    };
  }, []);

  const clearError = () => setAuthError(null);

  // ─── Login with Email ───────────────────────────────────────────────────────
  const login = async (email: string, pass: string, rememberMe: boolean = false): Promise<void> => {
    setLoading(true);
    setAuthError(null);

    try {
      // Step 1: Sign in with Firebase
      const result = await signInWithEmail(email, pass);
      if (result.error || !result.user) {
        throw new Error(result.error || 'Sign in failed.');
      }

      // Step 2: Refresh token immediately so cookie is fresh
      const token = await result.user.getIdToken(true);
      
      const cookieOptions: Cookies.CookieAttributes = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      };
      
      if (rememberMe) {
        cookieOptions.expires = 14; 
        Cookies.set('__persisted', 'true', { expires: 14, path: '/', secure: cookieOptions.secure });
      } else {
        Cookies.remove('__persisted');
      }

      Cookies.set('__session', token, cookieOptions);

      // Step 3: Fetch full profile to verify status
      const profileRes = await getCurrentUser();
      
      if (profileRes.success && profileRes.data) {
        const { role, status } = profileRes.data;

        // STRICT BLOCK: If BANNED or SUSPENDED, abort login immediately
        if (status === UserStatus.BANNED || status === UserStatus.SUSPENDED) {
          await signOutUser();
          Cookies.remove('__session');
          const errorMsg = status === UserStatus.BANNED 
            ? 'Access Revoked: This account has been permanently banned.' 
            : 'Access Suspended: This account is temporarily restricted.';
          throw new Error(errorMsg);
        }

        const standardOptions: Cookies.CookieAttributes = {
          expires: 14,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        };

        if (role) Cookies.set('__role', role, standardOptions);
        Cookies.set('__status', status, standardOptions);
      }

      // Step 4: Update login metadata in MongoDB (fire and forget)
      updateLoginMeta().catch((e) => console.warn('updateLoginMeta failed:', e));

    } catch (err: any) {
      const message = err.message || 'Failed to sign in.';
      setAuthError(message);
      setLoading(false);
      throw new Error(message);
    }

    setLoading(false);
  };

  // ─── Login with Google ──────────────────────────────────────────────────────
  const loginWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    setLoading(true);
    setAuthError(null);

    try {
      // apiGoogleSignIn: fires Google popup → gets Firebase user → hits /api/auth/google
      const response = await apiGoogleSignIn();

      if (!response.success) {
        throw new Error(response.message || 'Google sign-in failed.');
      }

      const { isNewUser, user: profileData } = response.data;

      if (profileData) {
        // STRICT BLOCK for Google Login
        if (profileData.status === UserStatus.BANNED || profileData.status === UserStatus.SUSPENDED) {
          await signOutUser();
          Cookies.remove('__session');
          const errorMsg = profileData.status === UserStatus.BANNED 
            ? 'Access Revoked: This account has been permanently banned.' 
            : 'Access Suspended: This account is temporarily restricted.';
          throw new Error(errorMsg);
        }

        const cookieOptions: Cookies.CookieAttributes = {
          expires: 14,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        };
        if (profileData.role) Cookies.set('__role', profileData.role, cookieOptions);
        if (profileData.status) Cookies.set('__status', profileData.status, cookieOptions);
      }

      if (!isNewUser) {
        // Existing user: update login metadata
        updateLoginMeta().catch((e) => console.warn('updateLoginMeta failed:', e));
      }

      setLoading(false);
      return { isNewUser };

    } catch (err: any) {
      const message = err.message || 'Google Sign-In failed.';
      setAuthError(message);
      setLoading(false);
      throw new Error(message);
    }
  };

  // ─── Register with Email ────────────────────────────────────────────────────
  /**
   * FIXED FLOW:
   * 1. Create Firebase Auth user (email + password)
   * 2. Get fresh ID token from Firebase
   * 3. Store token in cookie so /api/auth/register can verify it
   * 4. POST to /api/auth/register → creates MongoDB document
   * 5. Send email verification
   */
  const register = async (payload: RegisterPayload, pass: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);

    try {
      // Step 1: Create Firebase Auth user
      const result = await registerWithEmail(payload.email!, pass);

      if (result.error || !result.user) {
        throw new Error(result.error || 'Firebase registration failed.');
      }

      // Step 2: Get fresh token and store in cookie
      // This is critical — the backend needs this token to verify identity
      const token = await result.user.getIdToken(true);
      Cookies.set('__session', token, {
        expires: 14,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      // Step 3: Create MongoDB document via backend
      const backendResponse = await registerUser(payload);

      if (!backendResponse.success) {
        // If MongoDB creation fails, clean up the Firebase user to avoid orphans
        try {
          await result.user.delete();
        } catch (deleteErr) {
          console.error('Failed to clean up Firebase user after MongoDB failure:', deleteErr);
        }
        Cookies.remove('__session');
        throw new Error(backendResponse.message || 'Failed to create account profile.');
      }

      // Step 4: Store role and status cookies for middleware
      if (backendResponse.data) {
        const { role, status } = backendResponse.data;
        const cookieOptions: Cookies.CookieAttributes = {
          expires: 14,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        };
        if (role) Cookies.set('__role', role, cookieOptions);
        if (status) Cookies.set('__status', status, cookieOptions);
      }

      // Step 5: Reload Firebase user to sync state
      await reloadCurrentUser();

      // Step 6: Send verification email
      await sendEmailVerification().catch((err) => {
        // Non-fatal: log but don't block registration
        console.warn('Verification email failed to send:', err);
      });

    } catch (err: any) {
      const message = err.message || 'Registration failed.';
      setAuthError(message);
      setLoading(false);
      throw new Error(message);
    }

    setLoading(false);
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    setLoading(true);

    try {
      // Clear cookies first
      Cookies.remove('__session');
      Cookies.remove('__role');
      Cookies.remove('__status');
      Cookies.remove('__persisted');
      Cookies.remove('__onboarding_complete');

      // Call backend logout endpoint
      try {
        const { logoutUser } = await import('@/lib/api/auth.api');
        await logoutUser();
      } catch (e) {
        console.warn('Backend logout failed (non-fatal):', e);
      }

      // Sign out of Firebase
      await signOutUser();
      setFirebaseUser(null);

    } catch (err: any) {
      console.error('Logout error:', err);
      setAuthError('Logout encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        loading,
        authError,
        login,
        loginWithGoogle,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}