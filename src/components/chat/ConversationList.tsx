import React from 'react';
import { IConversation } from '@/types/chat.types';
import { UnreadBadge } from './UnreadBadge';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/enums';
import { MessageSquare } from 'lucide-react';

interface ConversationListProps {
  conversations: IConversation[];
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({ conversations, activeId, currentUserId, onSelect, isLoading }: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-bg-tertiary)]" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3.5 w-24 rounded bg-[var(--color-bg-tertiary)]" />
              <div className="h-3 w-36 rounded bg-[var(--color-bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <MessageSquare className="h-10 w-10 text-[var(--color-text-muted)] opacity-30 mb-3" />
        <p className="text-xs font-bold text-[var(--color-text-tertiary)]">No conversations yet</p>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Start a conversation from a job page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const other = conv.participants.find(p => p.uid !== currentUserId);
        if (!other) return null;

        const unread = conv.unreadCounts?.[currentUserId] || 0;
        const isActive = conv._id === activeId;
        const lastTime = conv.lastMessageAt
          ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        return (
          <button
            key={conv._id}
            onClick={() => onSelect(conv._id)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-secondary)]",
              isActive && "bg-[var(--color-bg-secondary)]"
            )}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {other.photo ? (
                <img 
                  src={other.photo} 
                  alt={other.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-bold text-[var(--color-primary)]">
                  {other.name.charAt(0).toUpperCase()}
                </div>
              )}
              {unread > 0 && <UnreadBadge count={unread} />}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">
                  {other.name}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                  {lastTime}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase px-1 py-px rounded",
                  other.role === UserRole.BOSS
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-blue-500/10 text-blue-600"
                )}>
                  {other.role}
                </span>
                <span className="truncate text-[11px] text-[var(--color-text-muted)]">
                  {conv.jobTitle}
                </span>
              </div>
              {conv.lastMessage && (
                <p className={cn(
                  "truncate text-[11px] mt-0.5",
                  unread > 0 
                    ? "font-semibold text-[var(--color-text-primary)]" 
                    : "text-[var(--color-text-muted)]"
                )}>
                  {conv.lastMessage}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
