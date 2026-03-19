import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTypingStart: () => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, onTypingStart, isLoading = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxChars = 1000;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  const handleSend = () => {
    const cleanText = text.trim();
    if (cleanText && cleanText.length <= maxChars && !isLoading) {
      onSend(cleanText);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      onTypingStart();
    }
  };

  return (
    <div className="flex shrink-0 items-end gap-2 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 min-h-[36px] max-h-[100px] resize-none rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none overflow-hidden"
        style={{ scrollbarWidth: 'none' }}
        rows={1}
        disabled={isLoading}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || text.length > maxChars || isLoading}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
