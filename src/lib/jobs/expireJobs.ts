/**
 * expireJobs.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight utility that marks OPEN jobs as EXPIRED when their
 * applicationDeadline has passed. Called at the start of GET /api/jobs
 * on every request as a background maintenance check.
 */

import { JobStatus } from '@/types/enums';
import Job from '@/models/Job.model';

/**
 * Bulk-updates all OPEN jobs whose applicationDeadline is in the past
 * to EXPIRED status. Returns the number of expired jobs.
 */
export async function expireJobs(): Promise<number> {
  const now = new Date();

  const result = await Job.updateMany(
    {
      status: JobStatus.OPEN,
      applicationDeadline: { $lt: now },
    },
    {
      $set: { status: JobStatus.EXPIRED },
    }
  );

  return result.modifiedCount;
}
