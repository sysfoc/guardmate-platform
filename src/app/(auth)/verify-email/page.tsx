'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { auth } from '@/lib/firebase/firebaseClient';
import { apiPost } from '@/lib/apiClient';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const { user, fetchUser } = useUser();
  const [isResending, setIsResending] = useState(false);
  const [isVerifyingDebug, setIsVerifyingDebug] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  // Mask email for privacy
  const maskedEmail = firebaseUser?.email 
    ? `${firebaseUser.email.split('@')[0][0]}***@${firebaseUser.email.split('@')[1]}`
    : 'your email';

  // Cooldown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const checkEmailVerified = useCallback(async () => {
    if (!auth.currentUser) return;
    
    try {
      // Reload user to get latest emailVerified status
      await auth.currentUser.reload();
      
      if (auth.currentUser.emailVerified) {
        setIsPolling(false);
        toast.success('Email verified successfully!');
        
        // Refresh MongoDB user state
        await fetchUser();
        
        // Redirect to onboarding (hard redirect to clear any auth page states)
        window.location.href = '/onboarding';
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }, [router, fetchUser]);

  // Polling every 5 seconds
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      checkEmailVerified();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPolling, checkEmailVerified]);

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setIsResending(true);
    try {
      // In a real app, you'd call a function to send the verification email
      // But Firebase sends it automatically on register if configured, 
      // or we can call sendEmailVerification(auth.currentUser!)
      const { sendEmailVerification } = await import('firebase/auth');
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast.success('Verification email resent!');
        setResendTimer(60);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const handleQuickVerify = async () => {
    setIsVerifyingDebug(true);
    try {
      const response = await apiPost('/api/auth/verify-debug', {});
      if (response.success) {
        toast.success('Development verification successful!');
        // The polling effect will pick up the change, but we can force it
        await checkEmailVerified();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Debug verification failed');
    } finally {
      setIsVerifyingDebug(false);
    }
  };

  return (
    <div className="p-8 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative mx-auto">
        <div className="bg-[var(--color-primary-light)] p-5 rounded-full w-20 h-20 flex items-center justify-center text-[var(--color-primary)] mx-auto relative z-10">
          <Mail className="h-10 w-10" />
        </div>
        {isPolling && (
          <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-[var(--color-primary)] opacity-20" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Verify your email</h1>
        <p className="text-[var(--color-text-secondary)]">
          We&apos;ve sent a verification link to <span className="font-bold text-[var(--color-text-primary)]">{maskedEmail}</span>. 
          Please click the link to verify your account.
        </p>
      </div>

      <div className="bg-[var(--color-bg-subtle)] p-4 rounded-xl border border-[var(--color-surface-border)] flex items-center justify-center gap-3">
        {isPolling ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Waiting for verification...
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            <span className="text-sm font-medium text-[var(--color-success)]">
              Verified! Redirecting...
            </span>
          </>
        )}
      </div>

      <div className="space-y-4 pt-4">
        <Button
          variant="outline"
          fullWidth
          onClick={handleResend}
          disabled={resendTimer > 0 || isResending}
          loading={isResending}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {resendTimer > 0 ? `Resend email (${resendTimer}s)` : 'Resend verification email'}
        </Button>
        
        <p className="text-xs text-[var(--color-text-muted)]">
          Can&apos;t find the email? Check your spam folder or try resending.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 pt-6 border-t border-dashed border-[var(--color-surface-border)]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-text-muted)] mb-3">
              Development Debug Mode
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]"
              onClick={handleQuickVerify}
              loading={isVerifyingDebug}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Quick Verify (Bypass Email)
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
