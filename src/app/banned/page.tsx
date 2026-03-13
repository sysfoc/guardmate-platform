'use client';

import React from 'react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

export default function BannedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-t-4 border-t-[var(--color-danger)] animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto bg-[var(--color-danger-light)]/20 p-5 rounded-3xl w-fit text-[var(--color-danger)] ring-1 ring-[var(--color-danger-light)]">
          <ShieldAlert className="h-12 w-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight uppercase">Account Banned</h1>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            Your access to <span className="font-bold text-[var(--color-text-primary)]">GuardMate</span> has been permanently revoked due to a serious violation of our community standards.
          </p>
        </div>

        <div className="bg-[var(--color-bg-subtle)]/50 p-4 rounded-2xl text-sm text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
          Banned accounts cannot log in or interact with the platform. If you believe this is an error, you may contact our appeal department.
        </div>

        <div className="pt-4 space-y-3">
          <Button 
            variant="outline" 
            fullWidth 
            size="lg"
            onClick={() => window.location.href = 'mailto:appeals@guardmate.com'}
            leftIcon={<Mail className="h-5 w-5" />}
            className="font-bold"
          >
            Appeal Decision
          </Button>
          <Button 
            variant="ghost" 
            fullWidth
            onClick={() => logout()}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
