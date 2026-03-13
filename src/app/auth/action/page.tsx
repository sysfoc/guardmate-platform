'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  applyActionCode, 
  verifyPasswordResetCode, 
  confirmPasswordReset,
  checkActionCode
} from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  Mail, 
  ShieldCheck,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

function AuthActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'reset-password'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasInitiated = React.useRef(false);
  const actionProcessed = React.useRef(false);

  useEffect(() => {
    // If we have a mode but no oobCode, it likely means we've already 
    // completed the action on the default Firebase handler and been 
    // redirected here via the "Continue" button.
    if ((mode === 'verifyEmail' || mode === 'resetPassword' || mode === 'recoverEmail') && !oobCode) {
      if (!actionProcessed.current) {
        actionProcessed.current = true;
        setStatus('success');
      }
      return;
    }

    if (!mode || !oobCode) {
      // Small delay to allow searchParams to stabilize in Next.js
      const timer = setTimeout(() => {
        if (!mode || !oobCode) {
          setStatus('error');
          setError('Invalid or missing action code.');
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Prevent double execution in Strict Mode or re-renders
    if (hasInitiated.current) return;
    hasInitiated.current = true;

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            await applyActionCode(auth, oobCode);
            actionProcessed.current = true;
            setStatus('success');
            break;
            
          case 'resetPassword':
            const userEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(userEmail);
            setStatus('reset-password');
            // We don't set actionProcessed.current here because we still 
            // need to call confirmPasswordReset later.
            break;
            
          case 'recoverEmail':
            await checkActionCode(auth, oobCode);
            actionProcessed.current = true;
            setStatus('success');
            break;

          default:
            setStatus('error');
            setError('Unsupported action mode.');
        }
      } catch (err: any) {
        console.error('Auth Action Error:', err);
        // Only show error if we aren't already in a success/reset state
        setStatus((prev) => {
          if (prev === 'success' || prev === 'reset-password') return prev;
          return 'error';
        });
        setError(err.message || 'The action code is invalid or has expired.');
      }
    };

    handleAction();
  }, [mode, oobCode]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (actionProcessed.current) return;

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      actionProcessed.current = true;
      setStatus('success');
      toast.success('Password has been reset successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
      // If it fails with a code-related error, we might need to show the error screen
      if (err.code?.includes('code')) {
        setStatus('error');
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Spinner size="lg" />
            <p className="text-[var(--color-text-secondary)] animate-pulse">Processing your request...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6 py-4">
            <div className="bg-[var(--color-success-light)] p-4 rounded-full w-20 h-20 flex items-center justify-center text-[var(--color-success)] mx-auto">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                {mode === 'verifyEmail' ? 'Email Verified!' : 'All Done!'}
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                {mode === 'verifyEmail' 
                  ? 'Your email address has been successfully verified. You can now access all platform features.'
                  : 'Your account has been updated successfully.'}
              </p>
            </div>
            <div className="pt-4 space-y-3">
              <Button 
                fullWidth 
                size="lg"
                onClick={() => window.location.href = continueUrl || '/dashboard/mate'}
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Continue to Platform
              </Button>
              <Button 
                variant="ghost" 
                fullWidth
                onClick={() => router.push('/')}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Back to Home
              </Button>
            </div>
          </div>
        );

      case 'reset-password':
        return (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-2 mb-4">
              <div className="bg-[var(--color-primary-light)]/30 p-5 rounded-3xl w-fit flex items-center justify-center text-[var(--color-primary)] mx-auto ring-1 ring-[var(--color-primary-light)]">
                <Lock className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Secure Your Account</h1>
              <p className="text-sm text-[var(--color-text-muted)] max-w-[280px] mx-auto">
                Set a strong password for <span className="font-bold text-[var(--color-text-primary)]">{email}</span>
              </p>
            </div>
            
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                leftIcon={<ShieldCheck className="h-4 w-4 text-[var(--color-text-muted)]" />}
                className="bg-[var(--color-bg-subtle)]/50 focus:bg-white transition-colors"
                helperText="Minimum 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                leftIcon={<Lock className="h-4 w-4 text-[var(--color-text-muted)]" />}
                className="bg-[var(--color-bg-subtle)]/50 focus:bg-white transition-colors"
              />
              <Button 
                type="submit" 
                fullWidth 
                size="lg" 
                loading={isSubmitting}
                className="font-bold tracking-wide mt-2"
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Set New Password
              </Button>
            </form>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6 py-4">
            <div className="bg-[var(--color-danger-light)] p-4 rounded-full w-20 h-20 flex items-center justify-center text-[var(--color-danger)] mx-auto">
              <AlertCircle className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Action Failed</h1>
              <p className="text-[var(--color-text-secondary)]">
                {error || 'The link is invalid, expired, or has already been used.'}
              </p>
            </div>
            <div className="pt-4">
              <Button 
                fullWidth 
                variant="outline"
                onClick={() => router.push('/login')}
              >
                Back to Login
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <Card className="w-full max-w-md p-8 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-[var(--color-primary)]" />
            <span className="text-2xl font-black tracking-tighter text-[var(--color-text-primary)]">
              GUARD<span className="text-[var(--color-primary)]">MATE</span>
            </span>
          </div>
        </div>
        {renderContent()}
      </Card>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
        <Spinner size="lg" />
      </div>
    }>
      <AuthActionHandler />
    </Suspense>
  );
}
