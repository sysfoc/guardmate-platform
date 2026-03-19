import React, { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { IConversation } from '@/types/chat.types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { Loader2, MessageSquare, ChevronLeft } from 'lucide-react';
import { UserRole } from '@/types/enums';

interface ChatWindowProps {
  conversation: IConversation | null;
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserName: string;
  currentUserPhoto: string | null;
  onBack?: () => void;
}

export function ChatWindow({ conversation, currentUserId, currentUserRole, currentUserName, currentUserPhoto, onBack }: ChatWindowProps) {
  const { 
    messages, 
    sendMessage, 
    isTyping, 
    typingUser, 
    loadMoreMessages, 
    hasMore, 
    isLoadingMessages,
    emitTypingStart 
  } = useChat(conversation ? conversation._id : null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pageScrollLock = useRef(false);

  useEffect(() => {
    if (bottomRef.current && pageScrollLock.current === false) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !isLoadingMessages) {
      pageScrollLock.current = true;
      const oldScrollHeight = e.currentTarget.scrollHeight;
      
      loadMoreMessages().then(() => {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - oldScrollHeight;
            pageScrollLock.current = false;
          }
        }, 50);
      });
    } else {
      pageScrollLock.current = false;
    }
  };

  // Empty state — no conversation selected
  if (!conversation) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--color-bg-secondary)]/30">
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-[var(--color-bg-tertiary)]">
            <MessageSquare className="h-8 w-8 text-[var(--color-text-muted)] opacity-40" />
          </div>
          <p className="text-sm font-bold text-[var(--color-text-tertiary)]">Select a conversation</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Choose a chat from the sidebar to start messaging.</p>
        </div>
      </div>
    );
  }

  const other = conversation.participants.find(p => p.uid !== currentUserId);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header Bar */}
      <div className="flex shrink-0 items-center gap-3 h-14 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-4">
        {onBack && (
          <button 
            onClick={onBack} 
            className="md:hidden flex items-center justify-center p-1 -ml-2 rounded-full hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {other?.photo ? (
          <img src={other.photo} alt={other.name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-bold text-[var(--color-primary)]">
            {other?.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{other?.name}</h2>
            <span className={`text-[8px] font-bold uppercase px-1 py-px rounded ${
              other?.role === UserRole.BOSS ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              {other?.role}
            </span>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] truncate">{conversation.jobTitle}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--color-bg-secondary)]/20 px-4 py-3"
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            {isLoadingMessages && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />}
          </div>
        )}
        
        <div className="mt-auto flex flex-col gap-1">
          {messages.map((msg, idx) => {
            const isOwn = msg.senderId === currentUserId;
            const isConsecutive = idx > 0 && messages[idx - 1].senderId === msg.senderId;
            return (
              <MessageBubble 
                key={msg._id || `opt-${idx}`} 
                message={msg} 
                isOwn={isOwn} 
                showAvatar={!isConsecutive} 
              />
            );
          })}
        </div>
        
        <TypingIndicator userName={isTyping ? typingUser?.userName ?? null : null} />
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput 
        onSend={(text) => sendMessage(text, { uid: currentUserId, name: currentUserName, photo: currentUserPhoto, role: currentUserRole })}
        onTypingStart={emitTypingStart}
        isLoading={false}
      />
    </div>
  );
}
