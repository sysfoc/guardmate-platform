import { NextRequest } from 'next/server';
import { createApiResponse, verifyAndGetUser } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation.model';
import Message from '@/models/Message.model';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Destructure params correctly for Next.js app router async params
) {
  try {
    const { id } = await params;
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const { user } = authResult;

    await connectDB();

    const conv = await Conversation.findById(id);
    if (!conv) {
      return createApiResponse(false, null, 'Conversation not found', 404);
    }

    const isParticipant = conv.participants.some(p => p.uid === user.uid);
    if (!isParticipant) {
      return createApiResponse(false, null, 'Unauthorized', 403);
    }

    // Mark other's messages as read
    await Message.updateMany(
      { conversationId: id, senderId: { $ne: user.uid }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Reset current user's unread counter
    const currentUnread = conv.unreadCounts || {};
    conv.set('unreadCounts', { ...currentUnread, [user.uid]: 0 });
    conv.markModified('unreadCounts');
    await conv.save();

    return createApiResponse(true, null, 'Messages marked as read', 200);
  } catch (error: any) {
    console.error('Mark Read Error:', error);
    return createApiResponse(false, null, 'Server error', 500);
  }
}
