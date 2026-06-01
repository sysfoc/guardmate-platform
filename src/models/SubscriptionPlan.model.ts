import mongoose, { Document, Model, Schema } from 'mongoose';
import { SubscriptionTier } from '@/types/enums';
import type { ISubscriptionPlan } from '@/types/subscriptionPlan.types';

// ─────────────────────────────────────────────────────────────────────────────
// SubscriptionPlan Model
// Phase 10: Multi-Tier Boss Subscription Plans
//
// Three documents are seeded automatically (STARTER, PROFESSIONAL, ENTERPRISE).
// Admin can toggle each on/off and configure all fields.
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionPlanDocument = ISubscriptionPlan & Document;

const SubscriptionPlanSchema = new Schema<SubscriptionPlanDocument>(
  {
    tier: {
      type: String,
      enum: Object.values(SubscriptionTier),
      required: true,
      unique: true,
      index: true,
    },
    isEnabled:               { type: Boolean, default: true },
    monthlyPrice:            { type: Number, default: 0, min: 0 },
    maxActiveJobs:           { type: Number, default: 3, min: 0 },
    maxGuardsPerJob:         { type: Number, default: 2, min: 1 },
    aiGuardMatchingEnabled:  { type: Boolean, default: false },
    analyticsEnabled:        { type: Boolean, default: false },
    maxDraftJobs:            { type: Number, default: 3, min: 0 },
    fullGuardProfileAccess:  { type: Boolean, default: false },
    boostJobsEnabled:        { type: Boolean, default: false },
    maxBoostedJobs:          { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ─── Default seed data ────────────────────────────────────────────────────────
export const DEFAULT_PLANS: Omit<ISubscriptionPlan, '_id' | 'createdAt' | 'updatedAt'>[] = [
  {
    tier: SubscriptionTier.STARTER,
    isEnabled: true,
    monthlyPrice: 29,
    maxActiveJobs: 3,
    maxGuardsPerJob: 2,
    aiGuardMatchingEnabled: false,
    analyticsEnabled: false,
    maxDraftJobs: 3,
    fullGuardProfileAccess: false,
    boostJobsEnabled: false,
    maxBoostedJobs: 0,
  },
  {
    tier: SubscriptionTier.PROFESSIONAL,
    isEnabled: true,
    monthlyPrice: 79,
    maxActiveJobs: 10,
    maxGuardsPerJob: 3,
    aiGuardMatchingEnabled: true,
    analyticsEnabled: true,
    maxDraftJobs: 10,
    fullGuardProfileAccess: true,
    boostJobsEnabled: true,
    maxBoostedJobs: 3,
  },
  {
    tier: SubscriptionTier.ENTERPRISE,
    isEnabled: true,
    monthlyPrice: 149,
    maxActiveJobs: 20,
    maxGuardsPerJob: 4,
    aiGuardMatchingEnabled: true,
    analyticsEnabled: true,
    maxDraftJobs: 15,
    fullGuardProfileAccess: true,
    boostJobsEnabled: true,
    maxBoostedJobs: 10,
  },
];

// ─── HMR-safe Model ──────────────────────────────────────────────────────────
const SubscriptionPlan: Model<SubscriptionPlanDocument> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<SubscriptionPlanDocument>('SubscriptionPlan', SubscriptionPlanSchema);

export default SubscriptionPlan;
