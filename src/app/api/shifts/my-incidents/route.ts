import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import IncidentReport from '@/models/IncidentReport.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';

/**
 * GET /api/shifts/my-incidents
 * Mate only — paginated list of all incident reports submitted by this guard.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only Mate accounts can view their incident reports.', 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = 10;
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      IncidentReport.find({ guardUid: user.uid })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IncidentReport.countDocuments({ guardUid: user.uid }),
    ]);

    return createApiResponse(true, { incidents, total }, 'Incident reports retrieved.', 200);
  } catch (error: unknown) {
    console.error('GET /api/shifts/my-incidents error:', error);
    return createApiResponse(false, null, 'Failed to retrieve incident reports.', 500);
  }
}
