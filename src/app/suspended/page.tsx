'use client';

import React from 'react';
import { Clock, LogOut, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

export default function SuspendedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-t-4 border-t-[var(--color-warning)] animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto bg-[var(--color-warning-light)]/20 p-5 rounded-3xl w-fit text-[var(--color-warning)] ring-1 ring-[var(--color-warning-light)]">
          <Clock className="h-12 w-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight uppercase">Login Restricted</h1>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            Your account is currently suspended and cannot be accessed at this time. This is usually due to a temporary policy violation or an ongoing investigation.
          </p>
        </div>

        <div className="bg-[var(--color-bg-subtle)]/50 p-4 rounded-2xl text-sm text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
          You will be unable to log in until the suspension period expires. Please refer to the email sent to your registered address for details.
        </div>

        <div className="pt-4 space-y-3">
          <Button 
            fullWidth 
            size="lg"
            onClick={() => window.location.href = 'mailto:support@guardmate.com'}
            leftIcon={<MessageSquare className="h-5 w-5" />}
            className="font-bold shadow-lg shadow-[var(--color-primary-light)]/20"
          >
            Contact Support
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
