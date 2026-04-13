'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { DisputesView } from '@/components/disputes/DisputesView';

export default function BossDisputesPage() {
  const { user } = useUser();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Disputes Resolution</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage and track your active and past disputes.</p>
      </div>

      {user && <DisputesView userRole="BOSS" userUid={user.uid} />}
    </div>
  );
}
