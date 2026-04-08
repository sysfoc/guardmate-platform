import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import Shift from '@/models/Shift.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, JobStatus, BidStatus } from '@/types/enums';
import { releasePayment } from '@/lib/payments/releasePayment';
import { sendShiftApproved, sendPaymentSent } from '@/lib/email/emailTriggers';
import { updateGuardReliabilityScore } from '@/lib/jobs/reliabilityScore';

/**
 * POST /api/shifts/[jobId]/approve
 * Boss only — approve one or all completed shifts for a job.
 * If shiftId is provided in body, approves that specific day.
 * If omitted, approves ALL unapproved checked-out shifts for this job.
 * Only completes the job if all shifts are approved AND the boss decides to complete it.
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
      return createApiResponse(false, null, 'Only Boss accounts can approve shifts.', 403);
    }

    const body = await request.json().catch(() => ({}));
    const { shiftId } = body;

    await connectDB();
    const { jobId } = await params;

    const job = await Job.findOne({ jobId });
    if (!job) return createApiResponse(false, null, 'Job not found.', 404);
    if (job.postedBy !== user.uid) return createApiResponse(false, null, 'Not your job.', 403);

    const now = new Date();
    let approvedCount = 0;

    if (shiftId) {
      // Approve single shift
      const shift = await Shift.findOne({ _id: shiftId, jobId });
      if (!shift) return createApiResponse(false, null, 'Shift record not found.', 404);
      if (!shift.checkOutTime) return createApiResponse(false, null, 'Cannot approve before checkout.', 400);
      if (shift.isApprovedByBoss) return createApiResponse(false, null, 'Already approved.', 400);

      shift.isApprovedByBoss = true;
      shift.approvedAt = now;
      shift.approvedBy = user.uid;
      await shift.save();
      approvedCount = 1;
    } else {
      // Bulk approve ALL unapproved checked-out shifts
      const result = await Shift.updateMany(
        { jobId, checkOutTime: { $ne: null }, isApprovedByBoss: false },
        { $set: { isApprovedByBoss: true, approvedAt: now, approvedBy: user.uid } }
      );
      approvedCount = result.modifiedCount;
      
      if (approvedCount === 0) {
        return createApiResponse(false, null, 'No complete unapproved shifts found.', 400);
      }
    }

    // Check if ALL shifts for this job are now approved
    const unapprovedCount = await Shift.countDocuments({ jobId, isApprovedByBoss: false });
    
    let updatedJob = job.toObject();
    
    // Only complete the job if ALL logged shifts are approved AND we're on or past the job's endDate.
    // This prevents multi-day jobs from completing simply because the Boss approved Day 1 early.
    const jobEndDate = new Date(job.endDate);
    const jobStartDate = new Date(job.startDate);
    const nowMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endMidnightUTC = new Date(Date.UTC(jobEndDate.getUTCFullYear(), jobEndDate.getUTCMonth(), jobEndDate.getUTCDate()));
    const startMidnightUTC = new Date(Date.UTC(jobStartDate.getUTCFullYear(), jobStartDate.getUTCMonth(), jobStartDate.getUTCDate()));

    const isPastOrOnEndDate = nowMidnightUTC.getTime() >= endMidnightUTC.getTime();
    const isSingleDayJob = startMidnightUTC.getTime() === endMidnightUTC.getTime();
    
    if (unapprovedCount === 0 && (isPastOrOnEndDate || isSingleDayJob)) {
      const updated = await Job.findOneAndUpdate(
        { jobId },
        { $set: { status: JobStatus.COMPLETED, completedAt: now } },
        { new: true }
      ).lean();
      if (updated) updatedJob = updated;

      // Update statistics and send emails for the full job completion
      const acceptedBid = await Bid.findOne({ jobId, status: BidStatus.ACCEPTED }).lean();
      if (acceptedBid) {
        await User.updateOne({ uid: acceptedBid.guardUid }, { $inc: { totalJobsCompleted: 1 } });
        await User.updateOne({ uid: user.uid }, { $inc: { completedJobsCount: 1 } });
        try { await updateGuardReliabilityScore(acceptedBid.guardUid); } catch { /* silient */ }

        // Trigger payment release
        try {
          await releasePayment(jobId);
        } catch (paymentError) {
          console.error(`Payment release failed for job ${jobId}:`, paymentError);
        }

        const guard = await User.findOne({ uid: acceptedBid.guardUid }).lean();
        if (guard) {
          try {
            await sendShiftApproved(guard.email, `${guard.firstName} ${guard.lastName}`, job.title, job.budgetAmount);
            await sendPaymentSent(guard.email, `${guard.firstName} ${guard.lastName}`, job.budgetAmount, job.title);
          } catch { /* silent */ }
        }
      }
    }

    return createApiResponse(
      true,
      { approvedCount, jobStatus: updatedJob.status },
      `Successfully approved ${approvedCount} shift(s).`,
      200
    );
  } catch (error: unknown) {
    console.error('POST /api/shifts/[jobId]/approve error:', error);
    return createApiResponse(false, null, 'Failed to approve shifts.', 500);
  }
}
