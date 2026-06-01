import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import BossSubscription from '@/models/BossSubscription.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, JobStatus, JobPaymentStatus, SubscriptionStatus } from '@/types/enums';
import { checkJobBoostAllowed } from '@/lib/subscriptions/planEnforcement';

/**
 * POST /api/jobs/[jobId]/boost
 * Boss only — boost a job listing (requires active plan with boostJobsEnabled).
 * Sets isFeatured = true, featuredUntil = boss's subscription period end.
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
      return createApiResponse(false, null, 'Only Boss accounts can boost jobs.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only boost your own jobs.', 403);
    }

    if (job.status !== JobStatus.OPEN) {
      return createApiResponse(false, null, 'Only OPEN jobs can be boosted.', 400);
    }

    if (job.paymentStatus === JobPaymentStatus.UNPAID) {
      return createApiResponse(false, null, 'Job must be funded (escrow paid) before boosting.', 400);
    }

    const now = new Date();

    if (job.isFeatured && job.featuredUntil && new Date(job.featuredUntil) > now) {
      return createApiResponse(false, null, 'This job is already boosted.', 400);
    }

    const boostCheck = await checkJobBoostAllowed(user.uid);
    if (!boostCheck.allowed) {
      return createApiResponse(false, null, boostCheck.message, 403);
    }

    const sub = await BossSubscription.findOne({
      bossUid: user.uid,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED] },
      currentPeriodEnd: { $gt: now },
    }).lean();

    if (!sub) {
      return createApiResponse(false, null, 'No active subscription found.', 403);
    }

    const featuredUntil = new Date(sub.currentPeriodEnd as Date);

    const updatedJob = await Job.findOneAndUpdate(
      { jobId },
      { $set: { isFeatured: true, featuredUntil } },
      { new: true }
    ).lean();

    return createApiResponse(true, updatedJob, 'Job boosted successfully.', 200);
  } catch (error: unknown) {
    console.error('POST /api/jobs/[jobId]/boost error:', error);
    return createApiResponse(false, null, 'Failed to boost job.', 500);
  }
}

/**
 * DELETE /api/jobs/[jobId]/boost
 * Boss only — remove the boost from a job.
 */
export async function DELETE(
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
      return createApiResponse(false, null, 'Only Boss accounts can remove boosts.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only remove boosts from your own jobs.', 403);
    }

    const updatedJob = await Job.findOneAndUpdate(
      { jobId },
      { $set: { isFeatured: false, featuredUntil: null } },
      { new: true }
    ).lean();

    return createApiResponse(true, updatedJob, 'Boost removed successfully.', 200);
  } catch (error: unknown) {
    console.error('DELETE /api/jobs/[jobId]/boost error:', error);
    return createApiResponse(false, null, 'Failed to remove boost.', 500);
  }
}
