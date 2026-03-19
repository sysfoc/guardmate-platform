'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { getMyConversations } from '@/lib/api/chat.api';
import { IConversation } from '@/types/chat.types';
import { UserRole } from '@/types/enums';
import { ChevronLeft } from 'lucide-react';

interface ChatPageProps {
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserName: string;
  currentUserPhoto: string | null;
}

export function ChatPage({ currentUserId, currentUserRole, currentUserName, currentUserPhoto }: ChatPageProps) {
  const searchParams = useSearchParams();
  const focusConversationId = searchParams.get('conversation');

  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(focusConversationId);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileViewList, setIsMobileViewList] = useState(!focusConversationId);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getMyConversations(1, 100).then(res => {
      if (!mounted) return;
      if (res.success && res.data) {
        setConversations(res.data.data);
      }
    }).finally(() => setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleSelect = (id: string) => {
    setActiveId(id);
    setIsMobileViewList(false);
  };

  const handleBack = () => {
    setActiveId(null);
    setIsMobileViewList(true);
  };

  const activeConversation = conversations.find(c => c._id === activeId) || null;

  return (
    <div className="flex h-[calc(100dvh-64px)] w-full overflow-hidden border-t border-[var(--color-border-primary)]">
      
      {/* Sidebar */}
      <div className={`w-full shrink-0 flex-col border-r border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] md:w-[340px] md:flex ${isMobileViewList ? 'flex' : 'hidden'}`}>
        {/* Sidebar Header */}
        <div className="flex h-14 shrink-0 items-center px-4 border-b border-[var(--color-border-primary)]">
          <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">Chats</h2>
        </div>
        <ConversationList 
          conversations={conversations}
          activeId={activeId}
          currentUserId={currentUserId}
          onSelect={handleSelect}
          isLoading={isLoading}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col bg-[var(--color-bg-primary)] ${!isMobileViewList ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow 
          conversation={activeConversation}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          currentUserName={currentUserName}
          currentUserPhoto={currentUserPhoto}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
