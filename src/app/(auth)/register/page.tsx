'use client';

/**
 * RegisterPage.tsx — FIXED
 *
 * Key fixes:
 * 1. Email registration: Firebase user created first → MongoDB doc created
 * 2. Google registration: detects existing Firebase session → calls assignRole
 * 3. Role selection step works for both flows
 * 4. Proper redirects: email → /verify-email, google → /onboarding
 * 5. All errors surface via toast
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Shield,
  Check,
  CheckCircle2,
  UserCircle2,
  Mail,
  Phone,
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { usePlatformContext } from '@/context/PlatformContext';
import { assignRole } from '@/lib/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Divider } from '@/components/ui/Divider';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Card } from '@/components/ui/Card';
import { UserRole } from '@/types/enums';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Step = 1 | 2;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, loginWithGoogle, firebaseUser } = useAuth();
  const { fetchUser } = useUser();
  const { platformCountry } = usePlatformContext();

  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<UserRole | null>(null);

  // Detect if user already has a Firebase session (came from Google)
  const isGoogleFlow = !!firebaseUser;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: 'GB',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Sync step from URL param (?step=role → step 1)
  useEffect(() => {
    const urlStep = searchParams.get('step');
    if (urlStep === 'role') setStep(1);
  }, [searchParams]);

  // Pre-fill name from Google profile if available
  useEffect(() => {
    if (firebaseUser?.displayName && !formData.firstName) {
      const parts = firebaseUser.displayName.split(' ');
      setFormData((prev) => ({
        ...prev,
        firstName: parts[0] ?? '',
        lastName:  parts.slice(1).join(' ') ?? '',
        email:     firebaseUser.email ?? '',
      }));
    }
  }, [firebaseUser]);

  const lockedCountry = React.useMemo(() => platformCountry ? {
    name: platformCountry.countryName,
    code: platformCountry.countryCode,
    dialCode: platformCountry.dialCode,
    flag: platformCountry.flag,
  } : null, [platformCountry]);

  // ── Role Selection ─────────────────────────────────────────────────────────
  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  // ── Google Sign Up ─────────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const { isNewUser } = await loginWithGoogle();
      if (isNewUser) {
        if (role) {
          // User already selected a role before clicking Google (from Step 2)
          // Pre-fill name from firebaseUser if available
          const { auth } = await import('@/lib/firebase/firebaseClient');
          const fbUser = auth.currentUser;
          const nameParts = (fbUser?.displayName || 'New User').split(' ');
          
          await assignRole({
            role,
            firstName: nameParts[0] || 'New',
            lastName: nameParts.slice(1).join(' ') || 'User',
          });
          await fetchUser();
          toast.success('Account created! Setting up your profile...');
          window.location.href = '/onboarding';
        } else {
          toast.success('Authenticated with Google! Now choose your role.');
          setStep(1);
        }
      } else {
        toast.success('Welcome back! Redirecting...');
        // For existing users, let the dashboard helper decide
        window.location.href = '/dashboard/mate'; // Middleware/UserContext will correct to proper role
      }
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ── Complete Registration ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) {
      toast.error('Please select a role first.');
      setStep(1);
      return;
    }

    // Validate
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Please enter your first and last name.');
      return;
    }
    if (!formData.termsAccepted) {
      toast.error('Please accept the Terms of Service to continue.');
      return;
    }

    setIsLoading(true);

    try {
      // ── GOOGLE FLOW ────────────────────────────────────────────────────────
      // Firebase user already exists (from Google OAuth), just create MongoDB doc
      if (isGoogleFlow) {
        await assignRole({
          role,
          firstName: formData.firstName.trim(),
          lastName:  formData.lastName.trim(),
        });

        // Refresh user in context
        await fetchUser();

        toast.success('Account created! Setting up your profile...');
        window.location.href = '/onboarding';
        return;
      }

      // ── EMAIL FLOW ─────────────────────────────────────────────────────────
      // Validate email-specific fields
      if (!formData.email.trim()) {
        toast.error('Please enter your email address.');
        setIsLoading(false);
        return;
      }
      if (platformCountry && formData.phoneCountryCode !== platformCountry.countryCode) {
        toast.error(`Only ${platformCountry.countryName} phone numbers are accepted on this platform.`);
        setIsLoading(false);
        return;
      }
      if (!formData.password) {
        toast.error('Please enter a password.');
        setIsLoading(false);
        return;
      }
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters.');
        setIsLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match.');
        setIsLoading(false);
        return;
      }

      // register() in AuthContext:
      //   1. Creates Firebase Auth user
      //   2. Gets token
      //   3. Creates MongoDB document
      //   4. Sends verification email
      await register(
        {
          role,
          firstName:        formData.firstName.trim(),
          lastName:         formData.lastName.trim(),
          email:            formData.email.trim(),
          phone:            formData.phone,
          phoneCountryCode: formData.phoneCountryCode,
        },
        formData.password
      );

      toast.success('Account created! Please verify your email.');
      window.location.href = '/verify-email';

    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 1: Role Selection ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Choose Your Path</h1>
          <p className="text-[var(--color-text-secondary)]">How do you want to use GuardMate?</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Boss Card */}
          <Card
            hover
            padding="lg"
            className={cn(
              'cursor-pointer relative transition-all border-2',
              role === UserRole.BOSS
                ? 'border-[var(--color-role-boss)] ring-1 ring-[var(--color-role-boss)]'
                : 'border-transparent'
            )}
            onClick={() => handleRoleSelect(UserRole.BOSS)}
          >
            <div className="flex items-start gap-4">
              <div className="bg-[var(--color-role-boss-light)] p-3 rounded-2xl text-[var(--color-role-boss)]">
                <Building2 className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">I am a Boss</h3>
                  {role === UserRole.BOSS && <CheckCircle2 className="h-5 w-5 text-[var(--color-role-boss)]" />}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Hiring and managing security personnel for your venues or events.
                </p>
                <ul className="mt-3 space-y-2">
                  {['Find verified security talent', 'Manage shifts & schedules', 'Automated invoice system'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Check className="h-3 w-3 text-[var(--color-success)]" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Mate Card */}
          <Card
            hover
            padding="lg"
            className={cn(
              'cursor-pointer relative transition-all border-2',
              role === UserRole.MATE
                ? 'border-[var(--color-role-mate)] ring-1 ring-[var(--color-role-mate)]'
                : 'border-transparent'
            )}
            onClick={() => handleRoleSelect(UserRole.MATE)}
          >
            <div className="flex items-start gap-4">
              <div className="bg-[var(--color-role-mate-light)] p-3 rounded-2xl text-[var(--color-role-mate)]">
                <Shield className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">I am a Mate</h3>
                  {role === UserRole.MATE && <CheckCircle2 className="h-5 w-5 text-[var(--color-role-mate)]" />}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Finding professional security shifts and managing your career.
                </p>
                <ul className="mt-3 space-y-2">
                  {['Access high-paying shifts', 'Digital SIA profile', 'Quick & secure payments'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Check className="h-3 w-3 text-[var(--color-success)]" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {!isGoogleFlow && (
          <>
            <Divider label="or sign up with" />
            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={handleGoogleSignUp}
              loading={isGoogleLoading}
              leftIcon={
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
            >
              Sign up with Google
            </Button>
          </>
        )}

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-[var(--color-primary)]">
            Login
          </Link>
        </p>
      </div>
    );
  }

  // ── Step 2: Registration Form ──────────────────────────────────────────────
  return (
    <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Create your {role === UserRole.BOSS ? 'Boss' : 'Mate'} Account
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isGoogleFlow
              ? 'Confirm your details to complete setup'
              : 'Tell us a bit about yourself'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            leftIcon={<UserCircle2 className="h-5 w-5" />}
            required
            autoComplete="given-name"
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            autoComplete="family-name"
          />
        </div>

        {/* Email + password only for non-Google flow */}
        {!isGoogleFlow && (
          <>
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="h-5 w-5" />}
              required
              autoComplete="email"
            />

            <PhoneInput
              label="Phone Number"
              value={formData.phone}
              onChange={(val) => setFormData({ ...formData, phone: val })}
              onCountryChange={(c) => setFormData({ ...formData, phoneCountryCode: c.code })}
              lockedCountry={lockedCountry}
              required
            />

            <div className="space-y-4">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                leftIcon={<Lock className="h-5 w-5" />}
                required
                autoComplete="new-password"
              />
              {formData.password && <PasswordStrength value={formData.password} />}

              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                leftIcon={<KeyRound className="h-5 w-5" />}
                required
                autoComplete="new-password"
              />
            </div>
          </>
        )}

        {/* Google flow: show email read-only */}
        {isGoogleFlow && firebaseUser?.email && (
          <div className="bg-[var(--color-bg-subtle)] rounded-lg px-4 py-3 border border-[var(--color-surface-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Signing up as</p>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{firebaseUser.email}</p>
          </div>
        )}

        <Checkbox
          label={
            <span className="text-xs">
              I agree to the{' '}
              <Link href="/terms" className="text-[var(--color-primary)] font-bold">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-[var(--color-primary)] font-bold">
                Privacy Policy
              </Link>
            </span>
          }
          checked={formData.termsAccepted}
          onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          rightIcon={<ArrowRight className="h-5 w-5" />}
        >
          {isGoogleFlow ? 'Complete Setup' : 'Create Account'}
        </Button>
      </form>

      {!isGoogleFlow && (
        <>
          <Divider label="or continue with" />
          <Button
            variant="outline"
            fullWidth
            size="lg"
            onClick={handleGoogleSignUp}
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
            Sign up with Google
          </Button>
        </>
      )}
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-[var(--color-primary)]">
          Login
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}