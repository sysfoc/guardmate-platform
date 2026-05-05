import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';
import { IConversation } from '@/types/chat.types';
import { ApiResponse, PaginatedResponse, MessagesPaginatedResponse } from '@/types/api.types';

/**
 * Creates a new conversation or retrieves an existing one for a specific job and participant.
 * @param jobId The associated job ID.
 * @param participantUid The user ID of the other chat participant.
 */
export async function createOrGetConversation(
  jobId: string,
  participantUid: string
): Promise<ApiResponse<IConversation>> {
  return await apiPost<IConversation>('/api/conversations', { jobId, participantUid });
}

/**
 * Retrieves a paginated list of all active conversations for the authenticated user.
 * @param page The page number for pagination.
 * @param limit The number of items per page.
 */
export async function getMyConversations(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PaginatedResponse<IConversation>>> {
  return await apiGet<PaginatedResponse<IConversation>>(`/api/conversations?page=${page}&limit=${limit}`);
}

/**
 * Retrieves a paginated list of chat messages for a specific conversation.
 * Also returns conversation lock state (isLocked, lockedAt, lockReason).
 * @param conversationId The ID of the conversation.
 * @param page The page number.
 * @param limit The maximum number of messages per page (defaults to 20).
 */
export async function getConversationMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<MessagesPaginatedResponse>> {
  return await apiGet<MessagesPaginatedResponse>(`/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
}

/**
 * REST fallback to mark all messages in a conversation as read by the other party.
 * @param conversationId The ID of the conversation to update.
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<ApiResponse<null>> {
  return await apiPatch<null>(`/api/conversations/${conversationId}/read`, {});
}

/**
 * Polls the total number of unread messages across all active user conversations.
 */
export async function getUnreadCount(): Promise<ApiResponse<{ totalUnread: number }>> {
  return await apiGet<{ totalUnread: number }>('/api/conversations/unread-count');
}
