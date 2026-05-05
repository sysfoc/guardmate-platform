'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket/socketClient';
import { getConversationMessages } from '@/lib/api/chat.api';
import { IMessage, ConversationParticipant } from '@/types/chat.types';
import { LockReason } from '@/types/enums';
import { Socket } from 'socket.io-client';

export function useChat(conversationId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Lock state from the messages API / real-time events
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket connection
  useEffect(() => {
    let mounted = true;
    getSocket().then(s => {
      if (mounted) {
        setSocket(s);
        setIsConnected(s.connected);
        
        s.on('connect', () => setIsConnected(true));
        s.on('disconnect', () => setIsConnected(false));
      }
    }).catch(console.error);

    return () => { mounted = false; };
  }, []);

  // Reset lock state when conversation changes
  useEffect(() => {
    setIsLocked(false);
    setLockReason(null);
  }, [conversationId]);

  // Handle Conversation Lifecycle & Events
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join room
    socket.emit('join-conversation', conversationId);
    
    // Mark as read immediately
    socket.emit('messages-read', { conversationId });

    const handleNewMessage = (msg: IMessage) => {
      if (msg.conversationId === conversationId) {
        setMessages(prev => {
          // Prevent duplicates if optimistic update already added it
          const exists = prev.some(m => m.text === msg.text && m.senderId === msg.senderId && Date.now() - new Date(m.createdAt).getTime() < 5000);
          if (exists) {
            return prev.map(m => m.text === msg.text && !m._id ? msg : m); // Replace optimistic with real
          }
          return [...prev, msg];
        });
        
        // If we are actively viewing, mark new ones as read quickly
        socket.emit('messages-read', { conversationId });
      }
    };

    const handleUserTyping = (data: { userId: string; userName: string }) => {
      setTypingUser({ userId: data.userId, userName: data.userName });
      setIsTyping(true);
    };

    const handleUserStoppedTyping = () => {
      setIsTyping(false);
      setTypingUser(null);
    };

    const handleMessagesRead = (data: { conversationId: string; readAt: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => ({ ...m, isRead: true, readAt: data.readAt })));
      }
    };

    const handleMessageError = (data: { conversationId: string; error: string }) => {
      if (data.conversationId === conversationId) {
        // If the error indicates conversation is locked, update local lock state
        if (data.error.toLowerCase().includes('locked')) {
          setIsLocked(true);
        }

        // Remove optimistic messages (those without a real DB _id)
        setMessages(prev => prev.filter(m => m._id !== ''));

        // Dispatch a custom event so ChatWindow can show a toast
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-message-error', { detail: data }));
        }
      }
    };

    // Real-time lock notification: server emits this when a job is completed/cancelled
    const handleConversationLocked = (data: { conversationId: string; lockReason: LockReason }) => {
      if (data.conversationId === conversationId) {
        setIsLocked(true);
        setLockReason(data.lockReason);
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stopped-typing', handleUserStoppedTyping);
    socket.on('messages-read-update', handleMessagesRead);
    socket.on('message-error', handleMessageError);
    socket.on('conversation-locked', handleConversationLocked);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stopped-typing', handleUserStoppedTyping);
      socket.off('messages-read-update', handleMessagesRead);
      socket.off('message-error', handleMessageError);
      socket.off('conversation-locked', handleConversationLocked);
    };
  }, [socket, conversationId]);

  // Initial historic fetch
  useEffect(() => {
    if (!conversationId) return;
    
    setIsLoadingMessages(true);
    getConversationMessages(conversationId, 1, 30).then(res => {
      if (res.success && res.data) {
        setMessages(res.data.data);
        setHasMore(res.data.hasNextPage);
        setPage(1);

        // Extract lock state from the messages API response
        if (res.data.isLocked) {
          setIsLocked(true);
          setLockReason(res.data.lockReason);
        }
      }
    }).finally(() => setIsLoadingMessages(false));
  }, [conversationId]);

  // Functions exposed to UI
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoadingMessages) return;
    
    setIsLoadingMessages(true);
    const nextPage = page + 1;
    const res = await getConversationMessages(conversationId, nextPage, 30);
    
    if (res.success && res.data) {
      // Historical messages are naturally ascending inside the returned array,
      // so prepend them to the existing list.
      setMessages(prev => [...res.data!.data, ...prev]);
      setHasMore(res.data.hasNextPage);
      setPage(nextPage);
    }
    setIsLoadingMessages(false);
  }, [conversationId, hasMore, isLoadingMessages, page]);

  const sendMessage = useCallback((text: string, senderObj: ConversationParticipant) => {
    if (!socket || !conversationId) return;

    // Optimistically update
    const optimisticMsg: IMessage = {
      _id: '', // Will be replaced by real DB id later
      conversationId,
      senderId: senderObj.uid,
      senderName: senderObj.name,
      senderPhoto: senderObj.photo,
      senderRole: senderObj.role,
      text,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    
    // Stop typing
    socket.emit('typing-stop', { conversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Broadcast
    socket.emit('send-message', { conversationId, text });
  }, [socket, conversationId]);

  const emitTypingStart = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('typing-start', { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  return { 
    messages, 
    sendMessage, 
    isTyping, 
    typingUser, 
    isConnected, 
    loadMoreMessages,
    hasMore,
    isLoadingMessages,
    emitTypingStart,
    isLocked,
    lockReason,
  };
}
