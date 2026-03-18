import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';

/**
 * GET /api/jobs/boss/my-jobs
 * Boss only — all jobs posted by this boss with aggregate stats.
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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12')));
    const skip = (page - 1) * limit;
    const status = url.searchParams.get('status');

    const query: Record<string, unknown> = { postedBy: user.uid };
    if (status) query.status = status;

    const [jobs, total, stats] = await Promise.all([
      Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(query),
      Job.aggregate([
        { $match: { postedBy: user.uid } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(total / limit);
    const statusCounts: Record<string, number> = {};
    stats.forEach((s: { _id: string; count: number }) => {
      statusCounts[s._id] = s.count;
    });

    return createApiResponse(true, {
      data: jobs,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      statusCounts,
    }, 'Boss jobs fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/jobs/boss/my-jobs error:', error);
    return createApiResponse(false, null, 'Failed to fetch your jobs.', 500);
  }
}
