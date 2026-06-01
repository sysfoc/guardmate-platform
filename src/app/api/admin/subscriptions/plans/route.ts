import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import SubscriptionPlan from '@/models/SubscriptionPlan.model';
import { seedSubscriptionPlans } from '@/lib/subscriptions/planEnforcement';
import { UserRole, SubscriptionTier } from '@/types/enums';

/**
 * GET /api/admin/subscriptions/plans
 * Admin only — returns all three plans (enabled and disabled).
 * Seeds defaults if not yet in DB.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, 'Unauthorized.', 401);
    if (authResult.user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Admin only.', 403);
    }

    await connectDB();
    await seedSubscriptionPlans();

    const plans = await SubscriptionPlan.find().sort({ monthlyPrice: 1 }).lean();
    return createApiResponse(true, plans, 'Plans fetched.', 200);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch plans.';
    return createApiResponse(false, null, msg, 500);
  }
}

/**
 * PATCH /api/admin/subscriptions/plans
 * Admin only — updates one plan tier's configuration.
 *
 * Body: { tier: SubscriptionTier, ...fields to update }
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, 'Unauthorized.', 401);
    if (authResult.user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Admin only.', 403);
    }

    await connectDB();
    await seedSubscriptionPlans();

    const body = await request.json();
    const { tier, ...updates } = body;

    if (!tier || !Object.values(SubscriptionTier).includes(tier)) {
      return createApiResponse(false, null, 'Invalid or missing tier.', 400);
    }

    // Whitelist updatable fields
    const allowed: Record<string, unknown> = {};
    const allowedFields = [
      'isEnabled', 'monthlyPrice', 'maxActiveJobs', 'maxGuardsPerJob',
      'aiGuardMatchingEnabled', 'analyticsEnabled', 'maxDraftJobs',
      'fullGuardProfileAccess', 'boostJobsEnabled', 'maxBoostedJobs',
    ];
    for (const key of allowedFields) {
      if (key in updates) allowed[key] = updates[key];
    }

    if (Object.keys(allowed).length === 0) {
      return createApiResponse(false, null, 'No valid fields provided.', 400);
    }

    // Validate numeric fields
    if (allowed.monthlyPrice !== undefined && (typeof allowed.monthlyPrice !== 'number' || (allowed.monthlyPrice as number) < 0)) {
      return createApiResponse(false, null, 'monthlyPrice must be a non-negative number.', 400);
    }
    if (allowed.maxActiveJobs !== undefined && (typeof allowed.maxActiveJobs !== 'number' || (allowed.maxActiveJobs as number) < 1)) {
      return createApiResponse(false, null, 'maxActiveJobs must be at least 1.', 400);
    }
    if (allowed.maxGuardsPerJob !== undefined && (typeof allowed.maxGuardsPerJob !== 'number' || (allowed.maxGuardsPerJob as number) < 1)) {
      return createApiResponse(false, null, 'maxGuardsPerJob must be at least 1.', 400);
    }
    if (allowed.maxDraftJobs !== undefined && (typeof allowed.maxDraftJobs !== 'number' || (allowed.maxDraftJobs as number) < 0)) {
      return createApiResponse(false, null, 'maxDraftJobs must be a non-negative number.', 400);
    }
    if (allowed.maxBoostedJobs !== undefined && (typeof allowed.maxBoostedJobs !== 'number' || (allowed.maxBoostedJobs as number) < 0)) {
      return createApiResponse(false, null, 'maxBoostedJobs must be a non-negative number.', 400);
    }

    const updated = await SubscriptionPlan.findOneAndUpdate(
      { tier },
      { $set: allowed },
      { new: true, lean: true }
    );

    if (!updated) {
      return createApiResponse(false, null, 'Plan not found.', 404);
    }

    return createApiResponse(true, updated, `${tier} plan updated successfully.`, 200);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update plan.';
    return createApiResponse(false, null, msg, 500);
  }
}
