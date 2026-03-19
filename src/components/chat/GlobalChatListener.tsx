'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { getSocket } from '@/lib/socket/socketClient';
import { getUnreadCount } from '@/lib/api/chat.api';
import { UnreadBadge } from './UnreadBadge';
import toast from 'react-hot-toast';
import { IMessage } from '@/types/chat.types';

interface GlobalChatListenerProps {
  userId?: string;
  role?: string;
  className?: string;
}

export function GlobalChatListener({ userId, role, className }: GlobalChatListenerProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  // Polling fallback
  useEffect(() => {
    if (!userId) return;

    const fetchCount = () => {
      getUnreadCount().then(res => {
        if (res.success && res.data) setUnreadCount(res.data.totalUnread);
      }).catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // 30s
    return () => clearInterval(interval);
  }, [userId, pathname]); // Re-fetch on path change (e.g. leaving chat)

  // Real-time socket updates
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let cleanupCurrentSocket: (() => void) | null = null;

    getSocket().then(socket => {
      if (!mounted) return;

      const handleNewMessage = (msg: IMessage) => {
        // If we received our own message, ignore
        if (msg.senderId === userId) return;

        // Check if we are currently viewing THIS exact conversation
        const isViewingChat = pathname.includes('/messages');
        const searchParams = new URLSearchParams(window.location.search);
        const activeConv = searchParams.get('conversation');

        if (isViewingChat && activeConv === msg.conversationId) {
          // It will be marked read by ChatWindow immediately
          return;
        }

        // Increment badging globally
        setUnreadCount(prev => prev + 1);

        // Show Custom Toast per prompt
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-toast-in' : 'animate-toast-out'
            } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-sm w-full rounded-xl pointer-events-auto flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors z-[99999]`}
            onClick={() => {
              toast.dismiss(t.id);
              const basePath = role === 'BOSS' ? '/dashboard/boss/messages' : '/dashboard/mate/messages';
              router.push(`${basePath}?conversation=${msg.conversationId}`);
            }}
          >
            {msg.senderPhoto ? (
              <img src={msg.senderPhoto} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]">
                {msg.senderName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{msg.senderName}</p>
                <span className="text-[9px] uppercase font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-1.5 py-0.5 rounded">
                  {msg.senderRole}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                {msg.text.length > 50 ? msg.text.slice(0, 50) + '...' : msg.text}
              </p>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      };

      const handleMessagesRead = () => {
        // Just re-poll to sync safely when we read something
        getUnreadCount().then(res => {
          if (res.success && res.data) setUnreadCount(res.data.totalUnread);
        });
      };

      socket.on('new-message', handleNewMessage);
      socket.on('messages-read-update', handleMessagesRead);

      cleanupCurrentSocket = () => {
        socket.off('new-message', handleNewMessage);
        socket.off('messages-read-update', handleMessagesRead);
      };
    }).catch(() => {});

    return () => { 
      mounted = false; 
      if (cleanupCurrentSocket) cleanupCurrentSocket();
    };
  }, [userId, pathname, router, role]);

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
      <UnreadBadge count={unreadCount} className="-top-1.5 -right-1.5 h-4 min-w-[16px] text-[9px] px-1 ring-[1.5px]" />
    </div>
  );
}
