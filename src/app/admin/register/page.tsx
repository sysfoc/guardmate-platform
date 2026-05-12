'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, User, Lock, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, XCircle } from 'lucide-react';
import { adminRegister } from '@/lib/api/adminAuth.api';
import toast from 'react-hot-toast';

function AdminRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Invalid Invitation</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            This invitation link is invalid or has expired. Please contact a Super Admin to receive a new invitation.
          </p>
          <button onClick={() => router.push('/admin/login')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            Go to Admin Login →
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Account Created!</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Your admin account has been set up. You can now sign in using your credentials.
          </p>
          <button onClick={() => router.push(`/admin/login?email=${encodeURIComponent(registeredEmail)}&from=invite`)}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25">
            Sign In Now <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your full name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      const resp = await adminRegister(token, firstName.trim(), lastName.trim(), password);
      if (resp.success) { setRegisteredEmail(resp.data.email); setSuccess(true); toast.success('Admin account created!'); }
    } catch (err: any) { setError(err.message || 'Registration failed.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/25">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Guard<span className="text-indigo-600">Mate</span></span>
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">Admin</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <User className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Create Your Account</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Complete your admin registration</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required
                  className="w-full h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required
                  className="w-full h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8}
                  className="w-full h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required
                  className="w-full h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25">
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>
      </div>
      <p className="mt-6 text-xs text-[var(--color-text-muted)]">&copy; {new Date().getFullYear()} GuardMate. Invitation-only registration.</p>
    </div>
  );
}

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600" /></div>}>
      <AdminRegisterForm />
    </Suspense>
  );
}
