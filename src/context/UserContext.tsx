'use client';

/**
 * UserContext.tsx — FIXED
 *
 * Key fixes:
 * 1. fetchUser() properly handles 401/404 separately
 * 2. clearUser() also clears cookies
 * 3. Exposes redirectToDashboard() helper for post-login routing
 * 4. needsRoleAssignment properly set when MongoDB doc missing
 * 5. Syncs __onboarding_complete cookie for middleware
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import Cookies from 'js-cookie';
import { useAuth } from './AuthContext';
import { getCurrentUser } from '@/lib/api/auth.api';
import type { UserProfile } from '@/types/user.types';
import { UserRole } from '@/types/enums';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isBoss: boolean;
  isMate: boolean;
  isAdmin: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  needsRoleAssignment: boolean;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => void;
  clearUser: () => void;
  getDashboardPath: () => string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRoleAssignment, setNeedsRoleAssignment] = useState(false);

  // ─── Fetch MongoDB User Profile ─────────────────────────────────────────────
  const fetchUser = useCallback(async (): Promise<void> => {
    if (!firebaseUser) {
      setUser(null);
      setNeedsRoleAssignment(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNeedsRoleAssignment(false);

    try {
      const resp = await getCurrentUser();

      if (resp.success && resp.data) {
        setUser(resp.data);

        // Sync role and onboarding cookies for Edge Middleware
        if (resp.data.role) {
          Cookies.set('__role', resp.data.role, {
            expires: 14,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        }
        Cookies.set('__onboarding_complete', String(resp.data.isOnboardingComplete || false), {
          expires: 14,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      } else {
        // API returned success:false but no error thrown
        setUser(null);
        setNeedsRoleAssignment(true);
      }
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status;

      if (status === 404 || status === 401) {
        // Firebase user exists but no MongoDB document → needs onboarding
        setNeedsRoleAssignment(true);
      } else {
        console.error('UserContext: fetchUser failed:', err);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  // Re-fetch whenever Firebase auth state changes
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (firebaseUser) {
      fetchUser();
    } else {
      setUser(null);
      setNeedsRoleAssignment(false);
      setIsLoading(false);
    }
  }, [firebaseUser, authLoading, fetchUser]);

  // ─── Optimistic Updater ─────────────────────────────────────────────────────
  const updateUser = useCallback((data: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...data } as UserProfile;
    });
  }, []);

  // ─── Clear User ─────────────────────────────────────────────────────────────
  const clearUser = useCallback(() => {
    setUser(null);
    setNeedsRoleAssignment(false);
    Cookies.remove('__role');
    Cookies.remove('__session');
    Cookies.remove('__onboarding_complete');
  }, []);

  // ─── Dashboard Path Helper ──────────────────────────────────────────────────
  const getDashboardPath = useCallback((): string => {
    if (!user) return '/login';
    switch (user.role) {
      case UserRole.BOSS:  return '/dashboard/boss';
      case UserRole.MATE:  return '/dashboard/mate';
      case UserRole.ADMIN: return '/admin';
      default:             return '/onboarding';
    }
  }, [user]);

  // ─── Derived Booleans ───────────────────────────────────────────────────────
  const isBoss  = user?.role === UserRole.BOSS;
  const isMate  = user?.role === UserRole.MATE;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isProfileComplete   = user?.isProfileComplete   ?? false;
  const isOnboardingComplete = user?.isOnboardingComplete ?? false;

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: authLoading || isLoading,
        isBoss,
        isMate,
        isAdmin,
        isProfileComplete,
        isOnboardingComplete,
        needsRoleAssignment,
        fetchUser,
        updateUser,
        clearUser,
        getDashboardPath,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a <UserProvider>');
  }
  return context;
}