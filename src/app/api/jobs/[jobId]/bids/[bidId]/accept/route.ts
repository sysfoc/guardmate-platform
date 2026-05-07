import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, BidStatus, JobStatus, HiringStatus, JobPaymentStatus } from '@/types/enums';

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

    // Prepare the atomic job update
    const jobUpdate: Record<string, unknown> = {
      $push: { acceptedGuards: newAcceptedGuard },
    };

    if (isFullyHired) {
      jobUpdate.$set = {
        status: JobStatus.FILLED,
        hiringStatus: HiringStatus.FULLY_HIRED,
        paymentStatus: JobPaymentStatus.UNPAID, // Boss must now fund escrow
      };

      // AUTO-ASSIGN: If the job only requires 1 guard, auto-assign all shift slots to them.
      const schedule = job.shiftSchedule || [];
      const hasSlots = schedule.some((day: any) => (day.slots || (typeof day.toObject === 'function' ? day.toObject().slots : [])).length > 0);

      if (job.numberOfGuardsNeeded === 1 && hasSlots) {
        console.log(`[Job ID: ${jobId}] Auto-assigning all shift slots for single-guard job.`);
        console.log(`[Job ID: ${jobId}] Target Guard UID: ${bid.guardUid}`);

        // Build a plain-JS updatedSchedule to avoid Mongoose subdocument serialization quirks
        const updatedSchedule = schedule.map((day: any) => {
          const dayObj = typeof day.toObject === 'function' ? day.toObject() : day;
          return {
            ...dayObj,
            slots: (dayObj.slots || []).map((slot: any) => {
              const slotObj = typeof slot.toObject === 'function' ? slot.toObject() : slot;
              console.log(`[Job ID: ${jobId}] Setting assignedGuardUid on slot ${slotObj.slotNumber} (Date: ${dayObj.date}) to ${bid.guardUid}`);
              return {
                ...slotObj,
                assignedGuardUid: bid.guardUid,
              };
            }),
          };
        });

        (jobUpdate.$set as Record<string, unknown>).shiftSchedule = updatedSchedule;
        (jobUpdate.$set as Record<string, unknown>).isShiftAssigned = true;
      }
    }

    await Job.updateOne({ jobId }, jobUpdate);

    // Only update remaining bids to rejected when fully hired, but DO NOT send rejection emails yet.
    // They will be handled either by auto-cancellation or when funds clear.
    if (isFullyHired) {
      await Bid.updateMany(
        { jobId, status: BidStatus.PENDING },
        { $set: { status: BidStatus.REJECTED, rejectedAt: now } }
      );

      // Update boss stats
      await User.updateOne(
        { uid: user.uid },
        { $inc: { activeJobsCount: -1 } }
      );
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
