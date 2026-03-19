import { NextRequest } from 'next/server';
import { createApiResponse, verifyAndGetUser } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation.model';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const { user } = authResult;

    await connectDB();

    const conversations = await Conversation.find({ 'participants.uid': user.uid }).lean();
    
    let totalUnread = 0;
    for (const conv of conversations) {
      const count = conv.unreadCounts?.[user.uid] || 0;
      totalUnread += count;
    }

    return createApiResponse(true, { totalUnread }, 'Unread count fetched', 200);
  } catch (error: any) {
    console.error('Fetch Unread Count Error:', error);
    return createApiResponse(false, null, 'Server error', 500);
  }
}
