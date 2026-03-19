import { UserRole } from '@/types/enums';

export interface UnreadCounts {
  [uid: string]: number;
}

export interface ConversationParticipant {
  uid: string;
  name: string;
  photo: string | null;
  role: UserRole;
}

export interface IConversation {
  _id: string;
  participants: ConversationParticipant[];
  jobId: string;
  jobTitle: string;
  lastMessage: string | null;
  lastMessageAt: Date | string | null;
  unreadCounts: UnreadCounts;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  senderRole: UserRole;
  text: string;
  isRead: boolean;
  readAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SendMessagePayload {
  conversationId: string;
  text: string;
}

export interface ChatState {
  messages: IMessage[];
  isTyping: boolean;
  typingUser: { userId: string; userName: string } | null;
  isConnected: boolean;
}
