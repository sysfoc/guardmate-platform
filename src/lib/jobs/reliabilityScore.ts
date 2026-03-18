/**
 * reliabilityScore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility for calculating and updating a Mate's reliability score.
 *
 * Formula: (totalJobsCompleted / max(totalJobsApplied, 1)) * 100 - (cancellationStrikes * 5)
 * Capped between 0 and 100.
 */

import User from '@/models/User.model';
import connectDB from '@/lib/mongodb';

/**
 * Pure calculation — no side effects.
 */
export function calculateReliabilityScore(
  totalJobsCompleted: number,
  totalJobsApplied: number,
  cancellationStrikes: number
): number {
  const base = (totalJobsCompleted / Math.max(totalJobsApplied, 1)) * 100;
  const penalty = cancellationStrikes * 5;
  return Math.min(100, Math.max(0, Math.round(base - penalty)));
}

/**
 * Reads the guard's current stats and writes the updated reliabilityScore.
 */
export async function updateGuardReliabilityScore(guardUid: string): Promise<number> {
  await connectDB();
  const guard = await User.findOne({ uid: guardUid }).lean();
  if (!guard) return 100;

  const score = calculateReliabilityScore(
    guard.totalJobsCompleted ?? 0,
    guard.totalJobsApplied ?? 0,
    guard.cancellationStrikes ?? 0
  );

  await User.updateOne({ uid: guardUid }, { $set: { reliabilityScore: score } });
  return score;
}
