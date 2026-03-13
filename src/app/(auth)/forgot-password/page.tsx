'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { forgotPassword } from '@/lib/api/auth.api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword({ email });
      setIsSubmitted(true);
      toast.success('Reset link sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return `${name[0]}${'*'.repeat(Math.min(name.length - 1, 3))}@${domain}`;
  };

  if (isSubmitted) {
    return (
      <div className="p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-center">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-[var(--color-success)] ring-2 ring-[var(--color-success-light)] rounded-full p-0.5" />
          <span className="text-xl font-black tracking-tighter text-[var(--color-text-primary)] uppercase">
            Guard<span className="text-[var(--color-primary)]">Mate</span>
          </span>
        </div>
      </div>
      
      <div className="mx-auto bg-[var(--color-success-light)]/30 p-5 rounded-3xl w-fit text-[var(--color-success)] ring-1 ring-[var(--color-success-light)]">
        <Mail className="h-10 w-10" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Check your inbox</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-[280px] mx-auto leading-relaxed">
          We&apos;ve sent a password reset link to <span className="font-bold text-[var(--color-text-primary)]">{maskEmail(email)}</span>. Please check your spam folder if you don&apos;t see it.
        </p>
      </div>

      <div className="pt-2 space-y-4">
        <Button 
          variant="outline" 
          fullWidth 
          size="lg"
          onClick={() => setIsSubmitted(false)}
          className="font-bold bg-[var(--color-bg-subtle)]/50"
        >
          Try another email
        </Button>

        <div className="flex justify-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-xs font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-[var(--color-primary)] ring-2 ring-[var(--color-primary-light)] rounded-full p-0.5" />
          <span className="text-xl font-black tracking-tighter text-[var(--color-text-primary)] uppercase">
            Guard<span className="text-[var(--color-primary)]">Mate</span>
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Reset password</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-[280px] mx-auto">
          Enter your email and we&apos;ll send you a link to recover your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4 text-[var(--color-text-muted)]" />}
          required
          className="bg-[var(--color-bg-subtle)]/50 focus:bg-white transition-colors"
        />

        <Button 
          type="submit" 
          fullWidth 
          size="lg" 
          loading={isLoading}
          className="font-bold tracking-wide"
        >
          Send reset link
        </Button>
      </form>

      <div className="text-center pt-2">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-xs font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest"
        >
          <ArrowLeft className="h-3 w-3" />
          Wait, I remember!
        </Link>
      </div>
    </div>
  );
}
