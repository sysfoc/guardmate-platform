import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bid from '@/models/Bid.model';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';

/**
 * GET /api/dashboard/mate/activity
 * Mate only — recent bid activity for the dashboard.
 * Returns the 5 most recent bids with attached job info.
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

    const bids = await Bid.find({ guardUid: user.uid })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Attach job details
    const jobIds = [...new Set(bids.map((b) => b.jobId))];
    const jobs = await Job.find({ jobId: { $in: jobIds } })
      .select('jobId title companyName status budgetAmount budgetType paymentStatus')
      .lean();
    const jobMap = new Map(jobs.map((j) => [j.jobId, j]));

    const activity = bids.map((bid) => {
      const job = jobMap.get(bid.jobId);
      
      // Strict Info Control: Mask ACCEPTED as PENDING if Boss hasn't paid
      const isUnpaid = job?.paymentStatus === 'UNPAID';
      const maskedStatus = (bid.status === 'ACCEPTED' && isUnpaid) ? 'PENDING' : bid.status;
      
      return {
        bidId: bid.bidId,
        jobId: bid.jobId,
        jobTitle: bid.jobTitle || job?.title || 'Unknown Job',
        companyName: job?.companyName || 'Unknown',
        bidStatus: maskedStatus,
        proposedRate: bid.proposedRate,
        totalProposed: bid.totalProposed,
        budgetType: bid.budgetType,
        createdAt: bid.createdAt,
      };
    });

    return createApiResponse(true, activity, 'Mate activity fetched.', 200);
  } catch (error: unknown) {
    console.error('GET /api/dashboard/mate/activity error:', error);
    return createApiResponse(false, null, 'Failed to fetch activity.', 500);
  }
}
