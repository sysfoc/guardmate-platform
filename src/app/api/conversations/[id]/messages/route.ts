import { NextRequest } from 'next/server';
import { createApiResponse, verifyAndGetUser } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation.model';
import Message from '@/models/Message.model';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Await params correctly per Next.js 15+ patterns
) {
  try {
    const { id } = await params;
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const { user } = authResult;

    await connectDB();

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return createApiResponse(false, null, 'Conversation not found', 404);
    }

    const isParticipant = conversation.participants.some(p => p.uid === user.uid);
    if (!isParticipant) {
      return createApiResponse(false, null, 'Unauthorized access to conversation', 403);
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '30')));
    const skip = (page - 1) * limit;

    const query = { conversationId: id };

    // Fetch descending so newest is first in DB (page 1 is newest messages)
    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(query)
    ]);

    // Reverse the array to return ascending for correct visual ordering in UI
    messages.reverse();

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: messages,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Messages fetched', 200);
  } catch (error: any) {
    console.error('Fetch Messages Error:', error);
    return createApiResponse(false, null, 'Server error', 500);
  }
}
