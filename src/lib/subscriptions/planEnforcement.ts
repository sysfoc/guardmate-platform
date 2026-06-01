// ─────────────────────────────────────────────────────────────────────────────
// planEnforcement.ts
// Phase 10: Multi-Tier Boss Subscription Plans
//
// Provides server-side helpers to:
//   1. Seed default plans if missing from DB.
//   2. Get the active plan features for a given boss.
//   3. Enforce per-plan limits before job creation.
// ─────────────────────────────────────────────────────────────────────────────

import connectDB from '@/lib/mongodb';
import BossSubscription from '@/models/BossSubscription.model';
import SubscriptionPlan, { DEFAULT_PLANS } from '@/models/SubscriptionPlan.model';
import { SubscriptionStatus, SubscriptionTier } from '@/types/enums';
import type { IActivePlanFeatures } from '@/types/subscriptionPlan.types';

/**
 * Ensures all three plan documents exist in MongoDB.
 * Upserts by tier so it is idempotent — safe to call on every cold start.
 */
export async function seedSubscriptionPlans(): Promise<void> {
  await connectDB();
  for (const plan of DEFAULT_PLANS) {
    await SubscriptionPlan.updateOne(
      { tier: plan.tier },
      { $setOnInsert: plan },
      { upsert: true }
    );
  }
}

/**
 * Returns the active plan features for a boss, or null if not subscribed /
 * subscription not required.
 *
 * @param bossUid - Firebase UID of the boss
 */
export async function getActivePlanFeatures(
  bossUid: string
): Promise<IActivePlanFeatures | null> {
  await connectDB();

  const sub = await BossSubscription.findOne({ bossUid }).lean();
  if (!sub || !sub.planTier) return null;

  const now = new Date();
  const isActive =
    (sub.status === SubscriptionStatus.ACTIVE ||
      sub.status === SubscriptionStatus.CANCELLED) &&
    sub.currentPeriodEnd != null &&
    new Date(sub.currentPeriodEnd) > now;

  if (!isActive) return null;

  const plan = await SubscriptionPlan.findOne({ tier: sub.planTier }).lean();
  if (!plan) return null;

  return {
    tier: plan.tier,
    monthlyPrice: plan.monthlyPrice,
    maxActiveJobs: plan.maxActiveJobs,
    maxGuardsPerJob: plan.maxGuardsPerJob,
    aiGuardMatchingEnabled: plan.aiGuardMatchingEnabled,
    analyticsEnabled: plan.analyticsEnabled,
    maxDraftJobs: plan.maxDraftJobs,
    fullGuardProfileAccess: plan.fullGuardProfileAccess,
    boostJobsEnabled: plan.boostJobsEnabled ?? false,
    maxBoostedJobs: plan.maxBoostedJobs ?? 0,
  };
}

/**
 * Checks whether a boss can post a new job given their active plan limits.
 *
 * @param bossUid         - Firebase UID of the boss
 * @param numberOfGuards  - Requested guards for the new job
 * @param isDraft         - True if creating as DRAFT, false for OPEN
 * @returns `{ allowed: true }` or `{ allowed: false, code, message }`
 */
export async function checkJobPostingAllowed(
  bossUid: string,
  numberOfGuards: number,
  isDraft: boolean
): Promise<{ allowed: true } | { allowed: false; code: string; message: string }> {
  const features = await getActivePlanFeatures(bossUid);
  if (!features) {
    return { allowed: false, code: 'NO_ACTIVE_PLAN', message: 'No active subscription plan found.' };
  }

  // ── Max guards per job ───────────────────────────────────────────────────
  if (numberOfGuards > features.maxGuardsPerJob) {
    return {
      allowed: false,
      code: 'MAX_GUARDS_EXCEEDED',
      message: `Your ${features.tier} plan allows a maximum of ${features.maxGuardsPerJob} guard${features.maxGuardsPerJob !== 1 ? 's' : ''} per job. Upgrade your plan to post jobs with more guards.`,
    };
  }

  if (isDraft) {
    // ── Max draft jobs ─────────────────────────────────────────────────────
    const Job = (await import('@/models/Job.model')).default;
    const { JobStatus } = await import('@/types/enums');
    const draftCount = await Job.countDocuments({ postedBy: bossUid, status: JobStatus.DRAFT });
    if (draftCount >= features.maxDraftJobs) {
      return {
        allowed: false,
        code: 'MAX_DRAFT_JOBS_EXCEEDED',
        message: `Your ${features.tier} plan allows a maximum of ${features.maxDraftJobs} draft job${features.maxDraftJobs !== 1 ? 's' : ''}. Please publish or delete an existing draft to continue.`,
      };
    }
  } else {
    // ── Max active (OPEN) jobs ─────────────────────────────────────────────
    const Job = (await import('@/models/Job.model')).default;
    const { JobStatus } = await import('@/types/enums');
    const activeCount = await Job.countDocuments({ postedBy: bossUid, status: JobStatus.OPEN });
    if (activeCount >= features.maxActiveJobs) {
      return {
        allowed: false,
        code: 'MAX_ACTIVE_JOBS_EXCEEDED',
        message: `Your ${features.tier} plan allows a maximum of ${features.maxActiveJobs} active job${features.maxActiveJobs !== 1 ? 's' : ''}. Upgrade your plan or close an existing job to post more.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Checks whether a boss can boost an additional job given their active plan limits.
 *
 * @param bossUid - Firebase UID of the boss
 * @returns `{ allowed: true }` or `{ allowed: false, code, message }`
 */
export async function checkJobBoostAllowed(
  bossUid: string
): Promise<{ allowed: true } | { allowed: false; code: string; message: string }> {
  const features = await getActivePlanFeatures(bossUid);
  if (!features) {
    return { allowed: false, code: 'NO_ACTIVE_PLAN', message: 'No active subscription plan found.' };
  }

  if (!features.boostJobsEnabled) {
    return {
      allowed: false,
      code: 'BOOST_NOT_IN_PLAN',
      message: `Job boosting is not included in your ${features.tier} plan. Upgrade to Professional or Enterprise to boost job listings.`,
    };
  }

  const Job = (await import('@/models/Job.model')).default;
  const { JobStatus } = await import('@/types/enums');
  const now = new Date();
  const activeBoostedCount = await Job.countDocuments({
    postedBy: bossUid,
    status: JobStatus.OPEN,
    isFeatured: true,
    featuredUntil: { $gt: now },
  });

  if (activeBoostedCount >= features.maxBoostedJobs) {
    return {
      allowed: false,
      code: 'MAX_BOOSTED_JOBS_EXCEEDED',
      message: `Your ${features.tier} plan allows a maximum of ${features.maxBoostedJobs} boosted job${features.maxBoostedJobs !== 1 ? 's' : ''} at a time. Remove a boost to add another.`,
    };
  }

  return { allowed: true };
}
