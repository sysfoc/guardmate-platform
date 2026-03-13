'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { UserRole } from '@/types/enums';
import BossProfileEdit from '@/app/dashboard/boss/profile/page';
import MateProfileEdit from '@/app/dashboard/mate/profile/page';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading, getDashboardPath, isOnboardingComplete, fetchUser } = useUser();

  useEffect(() => {
    // Fallback: If we have no user but we aren't loading, try one more time to fetchUser
    // This handles cases where the state didn't move fast enough during redirection
    if (!isLoading && !user) {
      fetchUser();
    }

    if (!isLoading && user && isOnboardingComplete) {
      window.location.href = getDashboardPath();
    }
  }, [user, isLoading, isOnboardingComplete, getDashboardPath, fetchUser]);

  // Handle loading or redirect state
  if (isLoading || !user || isOnboardingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-default)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] pb-20">
      
      {/* Onboarding Header Strip */}
      <div className="bg-white border-b border-[var(--color-surface-border)] px-6 py-6 shadow-sm mb-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">
            Welcome to GuardMate, {user.firstName}!
          </h1>
          <p className="text-[var(--color-text-secondary)] max-w-xl">
            You're almost there. Please complete your required profile information below to activate your account and access your dashboard.
          </p>
        </div>
      </div>

      {/* Re-use our robust profile edit pages directly as components */}
      <div className="onboarding-wrapper">
        {user.role === UserRole.BOSS ? <BossProfileEdit /> : <MateProfileEdit />}
      </div>
      
    </div>
  );
}
