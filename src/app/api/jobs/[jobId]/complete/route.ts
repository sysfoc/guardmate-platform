import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { JobStatus, UserRole, BidStatus } from '@/types/enums';
import { sendShiftApproved, sendPaymentSent } from '@/lib/email/emailTriggers';
import { updateGuardReliabilityScore } from '@/lib/jobs/reliabilityScore';

/**
 * POST /api/jobs/[jobId]/complete
 * Boss only — manually mark an IN_PROGRESS job as COMPLETED.
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
      return createApiResponse(false, null, 'Only Boss accounts can complete jobs.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only complete your own jobs.', 403);
    }

    if (job.status === JobStatus.COMPLETED) {
      return createApiResponse(true, job, 'Job is already marked as completed.', 200);
    }

    if (job.status !== JobStatus.IN_PROGRESS) {
      return createApiResponse(
        false,
        null,
        `Cannot complete a job with status ${job.status}. Only IN_PROGRESS jobs can be completed.`,
        400
      );
    }

    const now = new Date();

    // Update job status
    const updatedJob = await Job.findOneAndUpdate(
      { jobId, status: JobStatus.IN_PROGRESS },
      { $set: { status: JobStatus.COMPLETED, completedAt: now } },
      { new: true }
    ).lean();

    // Find the accepted guard
    const acceptedBid = await Bid.findOne({
      jobId,
      status: BidStatus.ACCEPTED,
    }).lean();

    if (acceptedBid) {
      // Increment guard's totalJobsCompleted
      await User.updateOne(
        { uid: acceptedBid.guardUid },
        { $inc: { totalJobsCompleted: 1 } }
      );

      // Increment boss's completedJobsCount
      await User.updateOne(
        { uid: user.uid },
        { $inc: { completedJobsCount: 1 } }
      );

      // Update guard reliability score
      try {
        await updateGuardReliabilityScore(acceptedBid.guardUid);
      } catch {
        // Non-critical
      }

      // Send emails
      const guard = await User.findOne({ uid: acceptedBid.guardUid }).lean();
      if (guard) {
        try {
          await sendShiftApproved(
            guard.email,
            `${guard.firstName} ${guard.lastName}`,
            job.title,
            job.budgetAmount
          );
          await sendPaymentSent(
            guard.email,
            `${guard.firstName} ${guard.lastName}`,
            job.budgetAmount,
            job.title
          );
        } catch {
          // Email failures must not crash the completion
        }
      }
    }

    return createApiResponse(true, updatedJob, 'Job marked as completed.', 200);
  } catch (error: unknown) {
    console.error('POST /api/jobs/[jobId]/complete error:', error);
    return createApiResponse(false, null, 'Failed to complete job.', 500);
  }
}
