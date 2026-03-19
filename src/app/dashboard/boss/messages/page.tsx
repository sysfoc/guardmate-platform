'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { ChatPage } from '@/components/chat/ChatPage';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types/enums';
import type { BossProfile } from '@/types/user.types';

export default function BossMessagesPage() {
  const { user, isLoading } = useUser();

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const boss = user as BossProfile;
  const displayName = boss.companyName || `${boss.firstName} ${boss.lastName}`;
  const displayPhoto = boss.profilePhoto || boss.companyLogo || null;

  return (
    <ChatPage 
      currentUserId={user.uid}
      currentUserRole={UserRole.BOSS}
      currentUserName={displayName}
      currentUserPhoto={displayPhoto}
    />
  );
}
