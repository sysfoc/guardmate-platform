import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, BidStatus, JobStatus, HiringStatus } from '@/types/enums';
import { sendBidAccepted, sendBidRejected } from '@/lib/email/emailTriggers';

/**
 * PATCH /api/jobs/[jobId]/bids/[bidId]/accept
 * Boss only — accept a bid.
 * Multi-guard flow: adds guard to acceptedGuards. Only sets FILLED when all guards hired.
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
      return createApiResponse(false, null, 'This job is already fully hired.', 400);
    }

    // Check if all positions already filled
    const currentAccepted = job.acceptedGuards || [];
    if (currentAccepted.length >= job.numberOfGuardsNeeded) {
      return createApiResponse(false, null, 'All guard positions have been filled.', 400);
    }

    const bid = await Bid.findOne({ bidId, jobId });
    if (!bid) {
      return createApiResponse(false, null, 'Bid not found.', 404);
    }

    if (bid.status !== BidStatus.PENDING) {
      return createApiResponse(false, null, `Cannot accept a bid with status ${bid.status}.`, 400);
    }

    // Check if this guard is already accepted
    if (currentAccepted.some((g: { guardUid: string }) => g.guardUid === bid.guardUid)) {
      return createApiResponse(false, null, 'This guard has already been accepted.', 400);
    }

    const now = new Date();

    // Accept this bid
    await Bid.updateOne(
      { bidId },
      { $set: { status: BidStatus.ACCEPTED, acceptedAt: now } }
    );

    // Add guard to acceptedGuards
    const newAcceptedGuard = {
      guardUid: bid.guardUid,
      guardName: bid.guardName,
      guardPhoto: bid.guardPhoto || null,
      bidId: bid.bidId,
      acceptedAt: now,
    };

    const newAcceptedCount = currentAccepted.length + 1;
    const isFullyHired = newAcceptedCount >= job.numberOfGuardsNeeded;

    // Update job
    const updateFields: Record<string, unknown> = {};
    if (isFullyHired) {
      updateFields.status = JobStatus.FILLED;
      updateFields.hiringStatus = HiringStatus.FULLY_HIRED;
    }

    await Job.updateOne(
      { jobId },
      {
        $push: { acceptedGuards: newAcceptedGuard },
        $set: updateFields,
      }
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

    // Only reject remaining bids and send rejection emails when fully hired
    if (isFullyHired) {
      const otherBids = await Bid.find({
        jobId,
        bidId: { $ne: bidId },
        status: BidStatus.PENDING,
      });

      await Bid.updateMany(
        { jobId, status: BidStatus.PENDING },
        { $set: { status: BidStatus.REJECTED, rejectedAt: now } }
      );

      // Update boss stats
      await User.updateOne(
        { uid: user.uid },
        { $inc: { activeJobsCount: -1 } }
      );

      // Send rejection emails to remaining guards
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
    }

    const updatedBid = await Bid.findOne({ bidId }).lean();

    const message = isFullyHired
      ? 'Bid accepted — all guard positions filled!'
      : `Bid accepted — ${newAcceptedCount} of ${job.numberOfGuardsNeeded} guards hired.`;

    return createApiResponse(true, updatedBid, message, 200);
  } catch (error: unknown) {
    console.error('PATCH /api/jobs/[jobId]/bids/[bidId]/accept error:', error);
    return createApiResponse(false, null, 'Failed to accept bid.', 500);
  }
}
