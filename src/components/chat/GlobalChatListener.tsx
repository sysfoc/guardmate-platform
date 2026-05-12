'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

interface GlobalChatListenerProps {
  userId?: string;
  role?: string;
  className?: string;
}

export function GlobalChatListener({ userId, role, className }: GlobalChatListenerProps) {
  const router = useRouter();

  if (!userId) return null;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ${className}`}
      onClick={() => {
        const basePath = role === 'BOSS' ? '/dashboard/boss/messages' : '/dashboard/mate/messages';
        router.push(basePath);
      }}
      title="Messages"
    >
      <MessageSquare className="h-5 w-5 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)] cursor-pointer" />
    </div>
  );
}
