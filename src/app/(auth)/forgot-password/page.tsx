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
      <div className="p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto bg-[var(--color-success-light)] p-4 rounded-full w-fit text-[var(--color-success)]">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Check your inbox</h1>
          <p className="text-[var(--color-text-secondary)]">
            We&apos;ve sent a password reset link to <span className="font-bold text-[var(--color-text-primary)]">{maskEmail(email)}</span>
          </p>
        </div>

        <div className="pt-4">
          <Button 
            variant="outline" 
            fullWidth 
            onClick={() => setIsSubmitted(false)}
          >
            Try another email
          </Button>
        </div>

        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reset password</h1>
        <p className="text-[var(--color-text-secondary)]">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-5 w-5" />}
          required
        />

        <Button 
          type="submit" 
          fullWidth 
          size="lg" 
          loading={isLoading}
        >
          Send reset link
        </Button>
      </form>

      <div className="text-center">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
