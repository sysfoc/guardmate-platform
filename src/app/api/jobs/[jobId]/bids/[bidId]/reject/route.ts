import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, BidStatus } from '@/types/enums';
import { sendBidRejected } from '@/lib/email/emailTriggers';

/**
 * PATCH /api/jobs/[jobId]/bids/[bidId]/reject
 * Boss only — reject a bid with optional reason.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; bidId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can reject bids.', 403);
    }

    await connectDB();
    const { jobId, bidId } = await params;

    // Verify ownership
    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only manage bids on your own jobs.', 403);
    }

    const bid = await Bid.findOne({ bidId, jobId });
    if (!bid) {
      return createApiResponse(false, null, 'Bid not found.', 404);
    }

    if (bid.status !== BidStatus.PENDING) {
      return createApiResponse(false, null, `Cannot reject a bid with status ${bid.status}.`, 400);
    }

    let rejectionReason: string | null = null;
    try {
      const body = await request.json();
      rejectionReason = body.rejectionReason || null;
    } catch {
      // No body — that's fine
    }

    await Bid.updateOne(
      { bidId },
      {
        $set: {
          status: BidStatus.REJECTED,
          rejectedAt: new Date(),
          ...(rejectionReason && { rejectionReason }),
        },
      }
    );

    // Send rejection email
    try {
      const guard = await User.findOne({ uid: bid.guardUid });
      if (guard?.email) {
        await sendBidRejected(
          guard.email,
          guard.firstName,
          job.title,
          `${user.firstName} ${user.lastName}`
        );
      }
    } catch (emailErr) {
      console.warn('Failed to send bid rejected email:', emailErr);
    }

    const updatedBid = await Bid.findOne({ bidId }).lean();

    return createApiResponse(true, updatedBid, 'Bid rejected.', 200);
  } catch (error: unknown) {
    console.error('PATCH /api/jobs/[jobId]/bids/[bidId]/reject error:', error);
    return createApiResponse(false, null, 'Failed to reject bid.', 500);
  }
}
