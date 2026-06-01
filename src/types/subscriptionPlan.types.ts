// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Subscription Plan Type Definitions
// Phase 10: Multi-Tier Boss Subscription Plans
// ─────────────────────────────────────────────────────────────────────────────

import { SubscriptionTier } from './enums';

/**
 * Represents a configurable subscription plan tier managed by the admin.
 * Three fixed tiers exist (Starter, Professional, Enterprise) and are seeded
 * on first access. Admin can toggle each on/off and configure all limits.
 */
export interface ISubscriptionPlan {
  _id?: string;

  /** Fixed tier identifier — one document per tier in MongoDB. */
  tier: SubscriptionTier;

  /** Admin can disable a tier to hide it from the boss plan selection UI. */
  isEnabled: boolean;

  /** Monthly price charged to the boss (in platform currency). */
  monthlyPrice: number;

  /** Max number of simultaneously OPEN jobs this boss can have. */
  maxActiveJobs: number;

  /** Max guards per job posting (numberOfGuardsNeeded limit). */
  maxGuardsPerJob: number;

  /** Whether the boss can use the AI Guard Matching feature. */
  aiGuardMatchingEnabled: boolean;

  /** Whether the boss can access Analytics & Reports. */
  analyticsEnabled: boolean;

  /** Max number of DRAFT jobs this boss can have at once. */
  maxDraftJobs: number;

  /** Whether the boss can view full guard profiles when reviewing bids. */
  fullGuardProfileAccess: boolean;

  /** Whether this tier includes the ability to boost job listings to the top. */
  boostJobsEnabled: boolean;

  /** Max number of simultaneously boosted (featured) jobs allowed on this tier. */
  maxBoostedJobs: number;

  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Slimmed-down plan features returned inside ISubscriptionStatus.
 * Used by frontend to conditionally show/hide features.
 */
export interface IActivePlanFeatures {
  tier: SubscriptionTier;
  monthlyPrice: number;
  maxActiveJobs: number;
  maxGuardsPerJob: number;
  aiGuardMatchingEnabled: boolean;
  analyticsEnabled: boolean;
  maxDraftJobs: number;
  fullGuardProfileAccess: boolean;
  boostJobsEnabled: boolean;
  maxBoostedJobs: number;
}
