import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole } from '@/types/enums';

// ─── GET /api/admin/activity ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const actionType = searchParams.get('actionType') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (actionType) filter.actionType = actionType;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      }
      filter.createdAt = dateFilter;
    }

    const [activities, total] = await Promise.all([
      AdminActivity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminActivity.countDocuments(filter),
    ]);

    const serialized = activities.map((a) => ({
      _id: String(a._id),
      adminUid: a.adminUid,
      adminName: a.adminName,
      actionType: a.actionType,
      targetType: a.targetType,
      targetId: a.targetId,
      targetName: a.targetName,
      targetRole: a.targetRole,
      details: a.details,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
    }));

    return createApiResponse(
      true,
      {
        activities: serialized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      'Activity log fetched.',
      200
    );
  } catch (error: unknown) {
    console.error('GET /api/admin/activity error:', error);
    return createApiResponse(false, null, 'Failed to fetch activity log.', 500);
  }
}
