import { LockReason } from '@/types/enums';
import Conversation from '@/models/Conversation.model';

/**
 * Locks all conversations for a given job.
 * Called when a job transitions to COMPLETED or CANCELLED.
 * Wrapped in try/catch so conversation locking never blocks the main job transition.
 *
 * Also emits real-time 'conversation-locked' socket events to all participants
 * so their UI updates immediately without needing to refresh.
 *
 * @param jobId The job ID whose conversations should be locked
 * @param reason The reason for locking (JOB_COMPLETED or JOB_CANCELLED)
 */
export async function lockConversations(jobId: string, reason: LockReason): Promise<void> {
  try {
    const now = new Date();

    // Find conversations BEFORE locking so we can emit socket events with their IDs
    const conversations = await Conversation.find({ jobId }).lean();

    await Conversation.updateMany(
      { jobId },
      {
        $set: {
          isLocked: true,
          lockedAt: now,
          lockReason: reason,
        },
      }
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Conversation Lock] Locked ${conversations.length} conversation(s) for job ${jobId} due to ${reason}`);
    }

    // Emit real-time lock notification to all connected clients in these conversations
    try {
      const { getIO } = await import('@/lib/socket/socketServer');
      const io = getIO();

      if (io && conversations.length > 0) {
        for (const conv of conversations) {
          const conversationId = conv._id.toString();
          io.to(conversationId).emit('conversation-locked', {
            conversationId,
            lockReason: reason,
          });
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Conversation Lock] Emitted lock events for ${conversations.length} conversation(s)`);
        }
      }
    } catch {
      // Socket emission failures must not block the lock operation
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Conversation Lock] Failed to emit socket events for job ${jobId}`);
      }
    }
  } catch (err) {
    // Never throw - conversation locking must not block job transitions
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Conversation Lock] Failed to lock conversations for job ${jobId}:`, err);
    }
  }
}
