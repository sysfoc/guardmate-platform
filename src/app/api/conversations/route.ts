import { NextRequest } from 'next/server';
import { createApiResponse, verifyAndGetUser } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation.model';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { UserRole } from '@/types/enums';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const { user } = authResult;

    const body = await req.json();
    const { jobId, participantUid } = body;

    if (!jobId || !participantUid) {
      return createApiResponse(false, null, 'Missing jobId or participantUid', 400);
    }

    if (user.uid === participantUid) {
      return createApiResponse(false, null, 'Cannot chat with yourself', 400);
    }

    await connectDB();

    const job = await Job.findOne({ jobId }).lean();
    if (!job) {
      return createApiResponse(false, null, 'Job not found', 404);
    }

    // Verify requesting user authorization
    let isAuthorized = false;
    if (user.role === UserRole.BOSS) {
      isAuthorized = job.postedBy === user.uid;
      // If Boss, the participant must have a bid
      const participantBid = await Bid.findOne({ jobId, guardUid: participantUid }).lean();
      if (!participantBid) {
        return createApiResponse(false, null, 'Participant has not bid on this job', 403);
      }
    } else if (user.role === UserRole.MATE) {
      const myBid = await Bid.findOne({ jobId, guardUid: user.uid }).lean();
      if (myBid) isAuthorized = true;
      // If Mate, participant must be the Boss who posted it
      if (job.postedBy !== participantUid) {
        return createApiResponse(false, null, 'Participant is not the job poster', 403);
      }
    }

    if (!isAuthorized) {
      return createApiResponse(false, null, 'Not authorized for this job thread', 403);
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      jobId,
      'participants.uid': { $all: [user.uid, participantUid] }
    });

    if (conversation) {
      return createApiResponse(true, conversation, 'Conversation retrieved', 200);
    }

    const otherUser = await User.findOne({ uid: participantUid }).lean();
    if (!otherUser) {
      return createApiResponse(false, null, 'Participant user not found', 404);
    }

    // Create new
    const newConversation = await Conversation.create({
      jobId,
      jobTitle: job.title,
      participants: [
        {
          uid: user.uid,
          name: user.role === UserRole.BOSS ? (user.companyName || `${user.firstName} ${user.lastName}`) : `${user.firstName} ${user.lastName}`,
          photo: user.profilePhoto || user.companyLogo || null,
          role: user.role,
        },
        {
          uid: otherUser.uid,
          name: otherUser.role === UserRole.BOSS ? (otherUser.companyName || `${otherUser.firstName} ${otherUser.lastName}`) : `${otherUser.firstName} ${otherUser.lastName}`,
          photo: otherUser.profilePhoto || otherUser.companyLogo || null,
          role: otherUser.role,
        }
      ],
      unreadCounts: { [user.uid]: 0, [otherUser.uid]: 0 }
    });

    return createApiResponse(true, newConversation, 'Conversation created', 201);
  } catch (error: any) {
    console.error('Create Conversation Error:', error);
    return createApiResponse(false, null, 'Server error', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const { user } = authResult;

    await connectDB();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const query = { 'participants.uid': user.uid };

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: conversations,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Conversations fetched', 200);
  } catch (error: any) {
    console.error('Fetch Conversations Error:', error);
    return createApiResponse(false, null, 'Server error', 500);
  }
}
