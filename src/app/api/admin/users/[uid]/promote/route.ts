import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole, AdminLevel } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';

// ─── POST /api/admin/users/[uid]/promote ──────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    await connectDB();
    const { uid } = await params;

    const targetUser = await User.findOne({ uid });
    if (!targetUser) {
      return createApiResponse(false, null, 'User not found.', 404);
    }

    if (targetUser.role === UserRole.ADMIN) {
      return createApiResponse(false, null, 'User is already an Admin.', 400);
    }

    targetUser.role = UserRole.ADMIN;
    targetUser.adminLevel = AdminLevel.SUPPORT;
    targetUser.permissions = ['MANAGE_USERS', 'VIEW_ANALYTICS', 'VERIFY_LICENSES'];
    await targetUser.save();

    const deviceInfo = getDeviceInfo(request);

    await AdminActivity.create({
      adminUid: auth.user.uid,
      adminName: `${auth.user.firstName} ${auth.user.lastName}`,
      actionType: AdminActionType.USER_PROMOTE,
      targetType: 'USER',
      targetId: targetUser.uid,
      targetName: `${targetUser.firstName} ${targetUser.lastName}`,
      targetRole: UserRole.ADMIN,
      details: `Promoted to Admin (Support level) by ${auth.user.firstName} ${auth.user.lastName}`,
      ipAddress: getClientIp(request),
      userAgent: deviceInfo.userAgent,
    });

    return createApiResponse(true, {
      uid: targetUser.uid,
      role: targetUser.role,
      fullName: `${targetUser.firstName} ${targetUser.lastName}`,
    }, 'User promoted to Admin successfully.', 200);
  } catch (error: unknown) {
    console.error('POST /api/admin/users/[uid]/promote error:', error);
    return createApiResponse(false, null, 'Failed to promote user.', 500);
  }
}
