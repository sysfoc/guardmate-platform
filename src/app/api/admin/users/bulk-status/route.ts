import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole, UserStatus } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';

// ─── POST /api/admin/users/bulk-status ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    await connectDB();
    const body = await request.json() as { uids: string[]; status: string; reason?: string };
    const { uids, status, reason } = body;

    if (!Array.isArray(uids) || uids.length === 0) {
      return createApiResponse(false, null, 'No users selected.', 400);
    }

    const validStatuses = Object.values(UserStatus);
    if (!validStatuses.includes(status as UserStatus)) {
      return createApiResponse(false, null, `Invalid status: ${status}`, 400);
    }

    if ((status === UserStatus.BANNED || status === UserStatus.SUSPENDED) && !reason) {
      return createApiResponse(false, null, 'Reason required for rejection or suspension.', 400);
    }

    // Bulk update
    await User.updateMany(
      { uid: { $in: uids } },
      { $set: { status } }
    );

    // Fetch updated users for activity logging
    const updatedUsers = await User.find({ uid: { $in: uids } }).select('uid firstName lastName role').lean();

    const actionMap: Record<string, AdminActionType> = {
      [UserStatus.ACTIVE]: AdminActionType.USER_APPROVE,
      [UserStatus.BANNED]: AdminActionType.USER_REJECT,
      [UserStatus.SUSPENDED]: AdminActionType.USER_SUSPEND,
    };
    const actionType = actionMap[status] || AdminActionType.USER_UPDATE;
    const deviceInfo = getDeviceInfo(request);
    const ip = getClientIp(request);

    // Log each action individually
    const activityDocs = updatedUsers.map((u) => ({
      adminUid: auth.user.uid,
      adminName: `${auth.user.firstName} ${auth.user.lastName}`,
      actionType,
      targetType: 'USER' as const,
      targetId: u.uid,
      targetName: `${u.firstName} ${u.lastName}`,
      targetRole: u.role,
      details: reason || `Bulk status change to ${status}`,
      ipAddress: ip,
      userAgent: deviceInfo.userAgent,
    }));

    await AdminActivity.insertMany(activityDocs);

    return createApiResponse(
      true,
      { updated: updatedUsers.length },
      `${updatedUsers.length} users updated to ${status}.`,
      200
    );
  } catch (error: unknown) {
    console.error('POST /api/admin/users/bulk-status error:', error);
    return createApiResponse(false, null, 'Bulk status update failed.', 500);
  }
}
