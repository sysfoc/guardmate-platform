import React from 'react';

interface TypingIndicatorProps {
  userName: string | null;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  if (!userName) return null;

  return (
    <div className="flex items-center gap-1.5 py-1 px-1 text-[11px] text-[var(--color-text-muted)]">
      <span className="font-medium">{userName}</span>
      <div className="flex items-center gap-0.5">
        <div className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: '0ms' }} />
        <div className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: '150ms' }} />
        <div className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
