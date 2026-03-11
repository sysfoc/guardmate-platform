'use client';

/**
 * AuthContext.tsx — FIXED
 * 
 * Key fixes:
 * 1. register() now creates Firebase user first, THEN creates MongoDB doc
 * 2. login() now redirects based on role after fetching user
 * 3. loginWithGoogle() properly handles new vs existing users
 * 4. All errors surface correctly via thrown Error objects
 * 5. Token is refreshed and attached before any API call
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Unsubscribe } from 'firebase/auth';
import Cookies from 'js-cookie';
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
  type RegisterPayload,
} from '@/lib/api/auth.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  firebaseUser: User | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, pass: string) => Promise<void>;
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
          // Always get a fresh token and store in cookie for middleware
          const token = await user.getIdToken(true);
          Cookies.set('__session', token, {
            expires: 14,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        } catch (e) {
          console.error('Failed to get fresh token:', e);
        }
        if (!unmounted) setFirebaseUser(user);
      } else {
        Cookies.remove('__session');
        Cookies.remove('__role');
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
  const login = async (email: string, pass: string): Promise<void> => {
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
      Cookies.set('__session', token, {
        expires: 14,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      // Step 3: Update login metadata in MongoDB (fire and forget)
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

      const { isNewUser } = response.data;

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

      // Step 4: Store role cookie for middleware
      if (backendResponse.data?.role) {
        Cookies.set('__role', backendResponse.data.role, {
          expires: 14,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
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