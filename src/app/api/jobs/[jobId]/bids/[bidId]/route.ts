import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, BidStatus, JobStatus } from '@/types/enums';
import { sendGuardWithdrewBid, sendJobReopenedToBidders } from '@/lib/email/emailTriggers';
import { updateGuardReliabilityScore } from '@/lib/jobs/reliabilityScore';

/**
 * DELETE /api/jobs/[jobId]/bids/[bidId]
 * Mate only — withdraw their own bid.
 * Handles PENDING, ACCEPTED+FILLED, ACCEPTED+IN_PROGRESS, and terminal statuses.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; bidId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only Mate accounts can withdraw bids.', 403);
    }

    await connectDB();
    const { jobId, bidId } = await params;

    const bid = await Bid.findOne({ bidId, jobId });
    if (!bid) {
      return createApiResponse(false, null, 'Bid not found.', 404);
    }

    if (bid.guardUid !== user.uid) {
      return createApiResponse(false, null, 'You can only withdraw your own bids.', 403);
    }

    // ── Terminal statuses ──────────────────────────────────────────────────
    if (bid.status === BidStatus.REJECTED || bid.status === BidStatus.WITHDRAWN) {
      return createApiResponse(false, null, 'This bid cannot be withdrawn.', 400);
    }

    const job = await Job.findOne({ jobId }).lean();

    // ── ACCEPTED + IN_PROGRESS: Blocked ────────────────────────────────────
    if (bid.status === BidStatus.ACCEPTED && job && job.status === JobStatus.IN_PROGRESS) {
      return createApiResponse(
        false,
        null,
        'You cannot withdraw from a shift that has already started. Please contact support or raise a dispute.',
        400
      );
    }

    // ── ACCEPTED + FILLED: Withdraw with penalty ───────────────────────────
    if (bid.status === BidStatus.ACCEPTED && job && job.status === JobStatus.FILLED) {
      const now = new Date();

      // Withdraw the bid
      await Bid.updateOne(
        { bidId },
        { $set: { status: BidStatus.WITHDRAWN, withdrawnAt: now } }
      );

      // Decrement totalBids
      await Job.updateOne({ jobId }, { $inc: { totalBids: -1 } });

      // Set job back to OPEN
      await Job.updateOne(
        { jobId, status: JobStatus.FILLED },
        { $set: { status: JobStatus.OPEN } }
      );

      // Apply penalty to guard
      await User.updateOne(
        { uid: user.uid },
        { $inc: { cancellationStrikes: 1 } }
      );

      // Update guard reliability score
      try {
        await updateGuardReliabilityScore(user.uid);
      } catch {
        // Non-critical
      }

      // Notify boss
      const boss = await User.findOne({ uid: job.postedBy }).lean();
      if (boss) {
        try {
          await sendGuardWithdrewBid(
            boss.email,
            `${boss.firstName} ${boss.lastName}`,
            `${user.firstName} ${user.lastName}`,
            job.title,
            new Date(job.startDate).toLocaleDateString('en-GB')
          );
        } catch {
          // Email failure non-critical
        }
      }

      // Reset all REJECTED bids on this job back to PENDING and notify them
      try {
        const rejectedBids = await Bid.find({
          jobId,
          status: BidStatus.REJECTED,
        }).lean();

        if (rejectedBids.length > 0) {
          await Bid.updateMany(
            { jobId, status: BidStatus.REJECTED },
            {
              $set: { status: BidStatus.PENDING, rejectedAt: null, rejectionReason: null },
              $inc: {},
            }
          );

          // Notify each guard whose bid was reopened
          for (const rejBid of rejectedBids) {
            try {
              const guard = await User.findOne({ uid: rejBid.guardUid }).lean();
              if (guard) {
                await sendJobReopenedToBidders(
                  guard.email,
                  `${guard.firstName} ${guard.lastName}`,
                  job.title,
                  job.jobId
                );
              }
            } catch {
              // Email failure non-critical
            }
          }
        }
      } catch {
        // Bid reset non-critical
      }

      const updatedBid = await Bid.findOne({ bidId }).lean();
      return createApiResponse(
        true,
        updatedBid,
        'Bid withdrawn. A cancellation strike has been applied. The job is now open for new applications.',
        200
      );
    }

    // ── PENDING: Free withdrawal ───────────────────────────────────────────
    if (bid.status === BidStatus.PENDING) {
      await Bid.updateOne(
        { bidId },
        { $set: { status: BidStatus.WITHDRAWN, withdrawnAt: new Date() } }
      );

      // Decrement totalBids on the job
      await Job.updateOne({ jobId }, { $inc: { totalBids: -1 } });

      const updatedBid = await Bid.findOne({ bidId }).lean();
      return createApiResponse(true, updatedBid, 'Bid withdrawn successfully.', 200);
    }

    return createApiResponse(false, null, 'This bid cannot be withdrawn.', 400);
  } catch (error: unknown) {
    console.error('DELETE /api/jobs/[jobId]/bids/[bidId] error:', error);
    return createApiResponse(false, null, 'Failed to withdraw bid.', 500);
  }
}
