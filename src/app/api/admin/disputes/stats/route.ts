import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import { UserRole } from '@/types/enums';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Forbidden. Admin only.', 403);
    }

    await connectDB();

    const [total, open, underReview, resolved, closed, allResolved] = await Promise.all([
      Dispute.countDocuments(),
      Dispute.countDocuments({ status: 'OPEN' }),
      Dispute.countDocuments({ status: 'UNDER_REVIEW' }),
      Dispute.countDocuments({ status: 'RESOLVED' }),
      Dispute.countDocuments({ status: 'CLOSED' }),
      Dispute.find({ status: { $in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { $ne: null } }).select('createdAt resolvedAt').lean()
    ]);

    let totalHours = 0;
    allResolved.forEach(d => {
      const created = new Date(d.createdAt as any).getTime();
      const resolvedDate = new Date(d.resolvedAt as any).getTime();
      totalHours += (resolvedDate - created) / (1000 * 60 * 60);
    });

    const averageResolutionHours = allResolved.length > 0 ? Math.round(totalHours / allResolved.length) : 0;

    return createApiResponse(true, {
      total,
      open,
      underReview,
      resolved,
      closed,
      averageResolutionHours
    }, 'Dispute stats fetched successfully.', 200);

  } catch (error: any) {
    console.error('GET /api/admin/disputes/stats error:', error);
    return createApiResponse(false, null, 'Failed to fetch dispute stats.', 500);
  }
}
