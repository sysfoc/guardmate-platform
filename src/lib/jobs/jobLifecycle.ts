/**
 * jobLifecycle.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight background lifecycle processor for jobs.
 * Called silently at the start of GET /api/jobs and GET /api/jobs/[jobId].
 * Must NEVER throw — all logic is wrapped in try/catch.
 *
 * Transitions:
 *   1. OPEN → EXPIRED   (applicationDeadline passed, no ACCEPTED bid)
 *   2. FILLED → IN_PROGRESS  (startDate + startTime reached)
 *   3. IN_PROGRESS → COMPLETED  (endDate + endTime + 24 h passed, not yet completed)
 */

import { JobStatus, BidStatus } from '@/types/enums';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { sendShiftApproved } from '@/lib/email/emailTriggers';
import connectDB from '@/lib/mongodb';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Combine a Date field and a time string like "14:30" into a single Date.
 */
function combineDateAndTime(date: Date, time: string): Date {
  const d = new Date(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/**
 * Process all automatic job lifecycle transitions.
 * Safe to call on every request — wrapped in try/catch, never throws.
 */
export async function processJobLifecycle(): Promise<void> {
  try {
    await connectDB();
    const now = new Date();

    // ── 1. OPEN → EXPIRED ─────────────────────────────────────────────────
    // Jobs whose applicationDeadline has passed and have no ACCEPTED bid.
    try {
      // Find job IDs that have an ACCEPTED bid so we can exclude them
      const jobsWithAcceptedBid = await Bid.distinct('jobId', {
        status: BidStatus.ACCEPTED,
      });

      const expireResult = await Job.updateMany(
        {
          status: JobStatus.OPEN,
          applicationDeadline: { $lt: now },
          jobId: { $nin: jobsWithAcceptedBid },
        },
        { $set: { status: JobStatus.EXPIRED } }
      );

      if (isDev && expireResult.modifiedCount > 0) {
        console.log(`[Lifecycle] OPEN → EXPIRED: ${expireResult.modifiedCount} job(s)`);
      }
    } catch (err) {
      if (isDev) console.error('[Lifecycle] OPEN → EXPIRED error:', err);
    }

    // ── 2. FILLED → IN_PROGRESS ───────────────────────────────────────────
    try {
      // We need to check startDate + startTime, so we query FILLED jobs and filter
      const filledJobs = await Job.find({ status: JobStatus.FILLED }).lean();

      for (const job of filledJobs) {
        const shiftStart = combineDateAndTime(new Date(job.startDate), job.startTime || '00:00');
        if (now >= shiftStart) {
          await Job.updateOne(
            { _id: job._id, status: JobStatus.FILLED },
            { $set: { status: JobStatus.IN_PROGRESS } }
          );
          if (isDev) {
            console.log(`[Lifecycle] FILLED → IN_PROGRESS: ${job.jobId}`);
          }
        }
      }
    } catch (err) {
      if (isDev) console.error('[Lifecycle] FILLED → IN_PROGRESS error:', err);
    }

    // ── 3. IN_PROGRESS → COMPLETED (auto, 24 h after shift end) ───────────
    try {
      const inProgressJobs = await Job.find({
        status: JobStatus.IN_PROGRESS,
        completedAt: null,
      }).lean();

      for (const job of inProgressJobs) {
        const shiftEnd = combineDateAndTime(new Date(job.endDate), job.endTime || '23:59');
        const autoCompleteThreshold = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);

        if (now >= autoCompleteThreshold) {
          await Job.updateOne(
            { _id: job._id, status: JobStatus.IN_PROGRESS, completedAt: null },
            { $set: { status: JobStatus.COMPLETED, completedAt: now } }
          );

          if (isDev) {
            console.log(`[Lifecycle] IN_PROGRESS → COMPLETED (auto): ${job.jobId}`);
          }

          // Find the accepted guard for this job
          const acceptedBid = await Bid.findOne({
            jobId: job.jobId,
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
              { uid: job.postedBy },
              { $inc: { completedJobsCount: 1 } }
            );

            // Send shift approved email
            const guard = await User.findOne({ uid: acceptedBid.guardUid }).lean();
            if (guard) {
              try {
                await sendShiftApproved(
                  guard.email,
                  `${guard.firstName} ${guard.lastName}`,
                  job.title,
                  job.budgetAmount
                );
              } catch {
                // Email failures must not crash the lifecycle
              }
            }
          }
        }
      }
    } catch (err) {
      if (isDev) console.error('[Lifecycle] IN_PROGRESS → COMPLETED error:', err);
    }
  } catch (err) {
    if (isDev) console.error('[Lifecycle] Fatal error in processJobLifecycle:', err);
  }
}
