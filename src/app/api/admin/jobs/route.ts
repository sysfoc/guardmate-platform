import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, JobStatus } from '@/types/enums';

/**
 * GET /api/admin/jobs
 * Admin only — paginated list of all jobs across the platform.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Admin access required.', 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const status = url.searchParams.get('status');
    const bossUid = url.searchParams.get('bossUid');
    const locationCity = url.searchParams.get('locationCity');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const search = url.searchParams.get('search');

    const query: Record<string, unknown> = {};

    if (status) query.status = status;
    if (bossUid) query.postedBy = bossUid;
    if (locationCity) query.locationCity = { $regex: locationCity, $options: 'i' };
    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.$lte = new Date(dateTo);
      query.startDate = dateQuery;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { jobId: { $regex: search, $options: 'i' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: jobs,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Admin jobs fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/admin/jobs error:', error);
    return createApiResponse(false, null, 'Failed to fetch admin jobs.', 500);
  }
}
