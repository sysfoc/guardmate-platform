'use client';

/**
 * LoginPage.tsx — FIXED
 *
 * Key fixes:
 * 1. useEffect watches `user` and redirects to correct dashboard after login
 * 2. Google login redirects new users to /register?step=role
 * 3. All errors surface via toast
 * 4. Loading states prevent double-submit
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Divider } from '@/components/ui/Divider';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle } = useAuth();
  const { user, isLoading: userLoading, getDashboardPath } = useUser();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ── Redirect once user profile is loaded ───────────────────────────────────
  // This fires after login() resolves AND UserContext fetches the MongoDB profile
  useEffect(() => {
    if (userLoading) return;          // still loading — wait
    if (!user) return;                // not logged in — stay on page

    // If user is logged in, determine where to redirect
    const redirectTo = searchParams.get('redirectTo');
    
    if (!user.isOnboardingComplete) {
      // Force onboarding if incomplete, regardless of intent
      router.replace('/onboarding');
    } else if (redirectTo && redirectTo !== '/onboarding') {
      // Send them to their originally intended destination
      router.replace(redirectTo);
    } else {
      // Default dashboard
      router.replace(getDashboardPath());
    }
  }, [user, userLoading, router, searchParams, getDashboardPath]);

  // ── Email/Password Login ───────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    if (!password) {
      toast.error('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back! Signing you in...');
      // ✅ Redirect happens via the useEffect above when user state populates
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google Login ───────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { isNewUser } = await loginWithGoogle();

      if (isNewUser) {
        toast.success('Authenticated via Google! Please select your role.');
        router.push('/register?step=role');
      } else {
        toast.success('Welcome back!');
        // Redirect handled by useEffect above when user populates
      }
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Welcome back</h1>
        <p className="text-[var(--color-text-secondary)]">Sign in to your GuardMate account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-5 w-5" />}
          required
          autoComplete="email"
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-5 w-5" />}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Checkbox
          label="Remember me for 14 days"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isLoading}
          disabled={isLoading || isGoogleLoading}
          leftIcon={<LogIn className="h-5 w-5" />}
        >
          Sign In
        </Button>
      </form>

      <Divider label="or continue with" className="my-6" />

      <Button
        variant="outline"
        fullWidth
        size="lg"
        onClick={handleGoogleLogin}
        loading={isGoogleLoading}
        disabled={isLoading || isGoogleLoading}
        leftIcon={
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        }
      >
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}