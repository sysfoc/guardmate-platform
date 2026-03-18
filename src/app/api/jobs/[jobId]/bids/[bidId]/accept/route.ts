import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, BidStatus, JobStatus } from '@/types/enums';
import { sendBidAccepted, sendBidRejected } from '@/lib/email/emailTriggers';

/**
 * PATCH /api/jobs/[jobId]/bids/[bidId]/accept
 * Boss only — accept a bid.
 * Sets bid ACCEPTED, all other bids REJECTED, job FILLED.
 * Triggers sendBidAccepted to winner and sendBidRejected to others.
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
      return createApiResponse(false, null, 'Only Boss accounts can accept bids.', 403);
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

    if (job.status === JobStatus.FILLED) {
      return createApiResponse(false, null, 'This job already has an accepted bid.', 400);
    }

    const bid = await Bid.findOne({ bidId, jobId });
    if (!bid) {
      return createApiResponse(false, null, 'Bid not found.', 404);
    }

    if (bid.status !== BidStatus.PENDING) {
      return createApiResponse(false, null, `Cannot accept a bid with status ${bid.status}.`, 400);
    }

    const now = new Date();

    // Accept this bid
    await Bid.updateOne(
      { bidId },
      { $set: { status: BidStatus.ACCEPTED, acceptedAt: now } }
    );

    // Reject all other pending bids
    const otherBids = await Bid.find({
      jobId,
      bidId: { $ne: bidId },
      status: BidStatus.PENDING,
    });

    await Bid.updateMany(
      { jobId, bidId: { $ne: bidId }, status: BidStatus.PENDING },
      { $set: { status: BidStatus.REJECTED, rejectedAt: now } }
    );

    // Update job status to FILLED
    await Job.updateOne(
      { jobId },
      { $set: { status: JobStatus.FILLED } }
    );

    // Update boss stats
    await User.updateOne(
      { uid: user.uid },
      { $inc: { activeJobsCount: -1 } }
    );

    // Send email to accepted guard
    try {
      const guard = await User.findOne({ uid: bid.guardUid });
      if (guard?.email) {
        await sendBidAccepted(
          guard.email,
          `${guard.firstName}`,
          job.title,
          `${user.firstName} ${user.lastName}`,
          new Date(job.startDate).toISOString().split('T')[0],
          job.location,
          bid.proposedRate
        );
      }
    } catch (emailErr) {
      console.warn('Failed to send bid accepted email:', emailErr);
    }

    // Send rejection emails to other guards
    for (const otherBid of otherBids) {
      try {
        const guard = await User.findOne({ uid: otherBid.guardUid });
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
    }

    const updatedBid = await Bid.findOne({ bidId }).lean();

    return createApiResponse(true, updatedBid, 'Bid accepted successfully.', 200);
  } catch (error: unknown) {
    console.error('PATCH /api/jobs/[jobId]/bids/[bidId]/accept error:', error);
    return createApiResponse(false, null, 'Failed to accept bid.', 500);
  }
}
