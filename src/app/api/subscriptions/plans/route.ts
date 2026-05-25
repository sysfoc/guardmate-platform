import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import SubscriptionPlan from '@/models/SubscriptionPlan.model';
import { seedSubscriptionPlans } from '@/lib/subscriptions/planEnforcement';
import { UserRole } from '@/types/enums';

/**
 * GET /api/subscriptions/plans
 * Boss only — returns all enabled subscription plans for display on the
 * plan selection page.  Seeds default plans on first call if missing.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, 'Unauthorized.', 401);
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can view subscription plans.', 403);
    }

    await connectDB();
    await seedSubscriptionPlans();

    const plans = await SubscriptionPlan.find({ isEnabled: true })
      .sort({ monthlyPrice: 1 })
      .lean();

    return createApiResponse(true, plans, 'Plans fetched successfully.', 200);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch plans.';
    return createApiResponse(false, null, msg, 500);
  }
}
