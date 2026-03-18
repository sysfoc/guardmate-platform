import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';

/**
 * GET /api/dashboard/boss/activity
 * Boss only — recent job activity for the dashboard.
 * Returns the 5 most recent jobs with key stats.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can access this.', 403);
    }

    await connectDB();

    const jobs = await Job.find({ postedBy: user.uid })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('jobId title status locationCity totalBids budgetAmount budgetType createdAt')
      .lean();

    const activity = jobs.map((job) => ({
      jobId: job.jobId,
      title: job.title,
      status: job.status,
      locationCity: job.locationCity,
      totalBids: job.totalBids,
      budgetAmount: job.budgetAmount,
      budgetType: job.budgetType,
      createdAt: job.createdAt,
    }));

    return createApiResponse(true, activity, 'Boss activity fetched.', 200);
  } catch (error: unknown) {
    console.error('GET /api/dashboard/boss/activity error:', error);
    return createApiResponse(false, null, 'Failed to fetch activity.', 500);
  }
}
