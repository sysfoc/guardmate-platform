import React from 'react';
import { IMessage } from '@/types/chat.types';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: IMessage;
  isOwn: boolean;
  showAvatar: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn("flex w-full", isOwn ? "justify-end" : "justify-start", showAvatar ? "mt-2" : "mt-0.5")}>
      <div className={cn("flex max-w-[75%] gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
        
        {/* Avatar */}
        {!isOwn && (
          <div className="flex w-7 shrink-0 flex-col justify-end">
            {showAvatar ? (
              message.senderPhoto ? (
                <img 
                  src={message.senderPhoto} 
                  alt={message.senderName} 
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[10px] font-bold text-[var(--color-primary)]">
                  {message.senderName.charAt(0).toUpperCase()}
                </div>
              )
            ) : <div className="h-7 w-7" />}
          </div>
        )}

        {/* Bubble */}
        <div className="flex flex-col">
          <div
            className={cn(
              "relative whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-[13px] leading-relaxed",
              isOwn
                ? "bg-[var(--color-primary)] text-white rounded-br-sm"
                : "bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-bl-sm"
            )}
          >
            {message.text}
          </div>
          
          {/* Time + Read Receipt */}
          <div className={cn("flex items-center gap-0.5 mt-0.5 text-[9px] text-[var(--color-text-muted)]", isOwn ? "justify-end pr-0.5" : "justify-start pl-0.5")}>
            <span>{time}</span>
            {isOwn && (
              message.isRead ? (
                <CheckCheck className="h-3 w-3 text-[var(--color-primary)]" />
              ) : (
                <Check className="h-3 w-3 opacity-50" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
