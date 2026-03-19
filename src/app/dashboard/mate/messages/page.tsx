'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { ChatPage } from '@/components/chat/ChatPage';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types/enums';

export default function MateMessagesPage() {
  const { user, isLoading } = useUser();

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <ChatPage 
      currentUserId={user.uid}
      currentUserRole={UserRole.MATE}
      currentUserName={`${user.firstName} ${user.lastName}`}
      currentUserPhoto={user.profilePhoto || null}
    />
  );
}
