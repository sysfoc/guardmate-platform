import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';

/**
 * GET /api/jobs/mate/my-bids
 * Mate only — all bids submitted by this guard with job details.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only Mate accounts can access this.', 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12')));
    const skip = (page - 1) * limit;
    const status = url.searchParams.get('status');

    const query: Record<string, unknown> = { guardUid: user.uid };
    if (status) query.status = status;

    const [bids, total] = await Promise.all([
      Bid.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Bid.countDocuments(query),
    ]);

    // Attach job details to each bid
    const jobIds = [...new Set(bids.map((b) => b.jobId))];
    const jobs = await Job.find({ jobId: { $in: jobIds } }).lean();
    const jobMap = new Map(jobs.map((j) => [j.jobId, j]));

    const bidsWithJobs = bids.map((bid) => ({
      ...bid,
      job: jobMap.get(bid.jobId) || null,
    }));

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: bidsWithJobs,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Your bids fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/jobs/mate/my-bids error:', error);
    return createApiResponse(false, null, 'Failed to fetch your bids.', 500);
  }
}
