'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { ROUTES } from '@/constants/routes';
import { UserRole } from '@/types/enums';
import type { UserProfile } from '@/types/user.types';

export interface UseRequireAuthOptions {
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { user, isLoading: userLoading, needsRoleAssignment } = useUser();
  const router = useRouter();

  const isLoading = authLoading || userLoading;

  useEffect(() => {
    if (isLoading) return;

    // 1. Unauthenticated completely
    if (!firebaseUser) {
      router.push(options.redirectTo || ROUTES.LOGIN);
      return;
    }

    // 2. Authenticated natively via Firebase but missing a MongoDB Account document
    if (needsRoleAssignment) {
      router.push('/onboarding/role'); // Expected dynamic route
      return;
    }

    // 3. Document exists but role verification applies
    if (user && options.requiredRole && user.role !== options.requiredRole) {
      router.push('/unauthorized');
      return;
    }

  }, [firebaseUser, user, isLoading, needsRoleAssignment, options.requiredRole, options.redirectTo, router]);

  return {
    user: user as UserProfile | null, // Strictly asserts type when used explicitly resolving `null` conditionally
    isLoading,
    firebaseUser,
  };
}
