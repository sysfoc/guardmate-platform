import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { JobStatus, UserRole, BidStatus } from '@/types/enums';
import {
  sendBidRejected,
  sendJobCancelledByBoss,
} from '@/lib/email/emailTriggers';

/**
 * POST /api/jobs/[jobId]/cancel
 * Boss only — cancel a job with status-based rules and penalties.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can cancel jobs.', 403);
    }

    await connectDB();
    const { jobId } = await params;
    const body = await request.json();

    const cancelReason: string = body.cancelReason;
    if (!cancelReason || typeof cancelReason !== 'string' || cancelReason.trim().length < 20) {
      return createApiResponse(
        false,
        null,
        'Cancel reason is required and must be at least 20 characters.',
        400
      );
    }

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only cancel your own jobs.', 403);
    }

    // ── Status-based rules ─────────────────────────────────────────────────

    if (job.status === JobStatus.IN_PROGRESS) {
      return createApiResponse(
        false,
        null,
        'Cannot cancel a job that is currently in progress. Please raise a dispute instead.',
        400
      );
    }

    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.EXPIRED ||
      job.status === JobStatus.CANCELLED
    ) {
      return createApiResponse(false, null, 'This job cannot be cancelled.', 400);
    }

    const now = new Date();

    // ── OPEN or DRAFT: Simple cancellation ─────────────────────────────────
    if (job.status === JobStatus.OPEN || job.status === JobStatus.DRAFT) {
      const updatedJob = await Job.findOneAndUpdate(
        { jobId, status: { $in: [JobStatus.OPEN, JobStatus.DRAFT] } },
        {
          $set: {
            status: JobStatus.CANCELLED,
            cancelReason: cancelReason.trim(),
            cancelledAt: now,
          },
        },
        { new: true }
      ).lean();

      // Update boss stats
      if (job.status === JobStatus.OPEN) {
        await User.updateOne(
          { uid: user.uid },
          { $inc: { activeJobsCount: -1, cancelledJobsCount: 1 } }
        );
      } else {
        await User.updateOne(
          { uid: user.uid },
          { $inc: { cancelledJobsCount: 1 } }
        );
      }

      // Notify all guards who submitted bids
      const bids = await Bid.find({ jobId }).lean();
      const bossName = `${user.firstName} ${user.lastName}`;
      for (const bid of bids) {
        try {
          await sendBidRejected(
            (await User.findOne({ uid: bid.guardUid }).lean())?.email || '',
            bid.guardName,
            job.title,
            bossName
          );
        } catch {
          // Email failures non-critical
        }
      }

      return createApiResponse(true, updatedJob, 'Job cancelled successfully.', 200);
    }

    // ── FILLED: Late cancellation with penalty ─────────────────────────────
    if (job.status === JobStatus.FILLED) {
      const updatedJob = await Job.findOneAndUpdate(
        { jobId, status: JobStatus.FILLED },
        {
          $set: {
            status: JobStatus.CANCELLED,
            cancelReason: cancelReason.trim(),
            cancelledAt: now,
          },
        },
        { new: true }
      ).lean();

      // Apply penalty to boss
      await User.updateOne(
        { uid: user.uid },
        {
          $inc: {
            cancelledJobsCount: 1,
            cancellationStrikes: 1,
          },
        }
      );

      // Notify the accepted guard
      const acceptedBid = await Bid.findOne({
        jobId,
        status: BidStatus.ACCEPTED,
      }).lean();

      if (acceptedBid) {
        const guard = await User.findOne({ uid: acceptedBid.guardUid }).lean();
        if (guard) {
          try {
            await sendJobCancelledByBoss(
              guard.email,
              `${guard.firstName} ${guard.lastName}`,
              job.title,
              new Date(job.startDate).toLocaleDateString('en-GB'),
              cancelReason.trim()
            );
          } catch {
            // Email failure non-critical
          }
        }
      }

      return createApiResponse(
        true,
        updatedJob,
        'Job cancelled. A cancellation strike has been applied.',
        200
      );
    }

    return createApiResponse(false, null, 'This job cannot be cancelled.', 400);
  } catch (error: unknown) {
    console.error('POST /api/jobs/[jobId]/cancel error:', error);
    return createApiResponse(false, null, 'Failed to cancel job.', 500);
  }
}
