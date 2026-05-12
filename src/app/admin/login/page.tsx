'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, KeyRound, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { adminLogin, adminVerifyOtp, adminResendOtp } from '@/lib/api/adminAuth.api';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseClient';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const handleChange = (i: number, c: string) => {
    if (!/^\d*$/.test(c)) return;
    const d = [...digits]; d[i] = c;
    onChange(d.join(''));
    if (c && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
  };
  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
          value={d} disabled={disabled} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)} onPaste={i === 0 ? handlePaste : undefined}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50"
          autoComplete="one-time-code" />
      ))}
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (otpCode.length === 6 && step === 2) handleVerifyOtp();
  }, [otpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setIsLoading(true);
    try {
      const resp = await adminLogin(email.trim(), password);
      if (resp.success) { setStep(2); setCooldown(60); toast.success('Verification code sent to your email.'); }
    } catch (err: any) { setError(err.message || 'Login failed.'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
    setError(''); setIsLoading(true);
    try {
      const resp = await adminVerifyOtp(email.trim(), otpCode);
      if (resp.success && resp.data) {
        const cred = await signInWithCustomToken(auth, resp.data.customToken);
        const idToken = await cred.user.getIdToken(true);
        const opts: Cookies.CookieAttributes = { expires: 14, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' };
        Cookies.set('__session', idToken, opts);
        Cookies.set('__role', 'ADMIN', opts);
        Cookies.set('__status', 'ACTIVE', opts);
        Cookies.set('__onboarding_complete', 'true', opts);
        toast.success('Welcome to the Admin Panel!');
        router.replace('/admin');
      }
    } catch (err: any) { setError(err.message || 'Invalid verification code.'); setOtpCode(''); }
    finally { setIsLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return; setError('');
    try { await adminResendOtp(email.trim()); setCooldown(60); setOtpCode(''); toast.success('New code sent.'); }
    catch (err: any) { setError(err.message || 'Failed to resend.'); }
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
          {step === 1 ? (
            <>
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4"><Lock className="h-6 w-6 text-indigo-600" /></div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Admin Sign In</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Enter your admin credentials to continue</p>
              </div>
              {error && <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"><AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@guardmate.com" required autoComplete="email"
                      className="w-full h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"
                      className="w-full h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25">
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Mail className="h-6 w-6 text-emerald-600" /></div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Check Your Email</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">We sent a 6-digit code to</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5">{email}</p>
              </div>
              {error && <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"><AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
              <div className="space-y-6">
                <OtpInput value={otpCode} onChange={setOtpCode} disabled={isLoading} />
                <button onClick={handleVerifyOtp} disabled={isLoading || otpCode.length !== 6}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25">
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><span>Verify &amp; Sign In</span><ArrowRight className="h-4 w-4" /></>}
                </button>
                <div className="text-center space-y-3">
                  <button onClick={handleResend} disabled={cooldown > 0} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed transition-colors">
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </button>
                  <div><button onClick={() => { setStep(1); setOtpCode(''); setError(''); }} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">← Back to sign in</button></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="mt-6 text-xs text-[var(--color-text-muted)]">&copy; {new Date().getFullYear()} GuardMate. Authorized personnel only.</p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600" /></div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
