import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole, UserStatus } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';
import { 
  sendAccountApproved, 
  sendAccountRejected, 
  sendAccountSuspended, 
  sendAccountBanned 
} from '@/lib/email/emailTriggers';

// ─── PATCH /api/admin/users/[uid]/status ──────────────────────────────────────

export async function PATCH(
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
    const body = await request.json() as { status: string; reason?: string };
    const { status, reason } = body;

    // Validate status value
    const validStatuses = Object.values(UserStatus);
    if (!validStatuses.includes(status as UserStatus)) {
      return createApiResponse(false, null, `Invalid status: ${status}`, 400);
    }

    // Require reason for BANNED and SUSPENDED
    if ((status === UserStatus.BANNED || status === UserStatus.SUSPENDED) && !reason) {
      return createApiResponse(false, null, 'Reason is required for rejection or suspension.', 400);
    }

    const targetUser = await User.findOne({ uid });
    if (!targetUser) {
      return createApiResponse(false, null, 'User not found.', 404);
    }

    targetUser.status = status as UserStatus;
    await targetUser.save();

    // Map status to action type
    const actionMap: Record<string, AdminActionType> = {
      [UserStatus.ACTIVE]: AdminActionType.USER_APPROVE,
      [UserStatus.BANNED]: AdminActionType.USER_REJECT,
      [UserStatus.SUSPENDED]: AdminActionType.USER_SUSPEND,
    };

    const actionType = actionMap[status] || AdminActionType.USER_UPDATE;
    const deviceInfo = getDeviceInfo(request);

    await AdminActivity.create({
      adminUid: auth.user.uid,
      adminName: `${auth.user.firstName} ${auth.user.lastName}`,
      actionType,
      targetType: 'USER',
      targetId: targetUser.uid,
      targetName: `${targetUser.firstName} ${targetUser.lastName}`,
      targetRole: targetUser.role,
      details: reason || `Status changed to ${status}`,
      ipAddress: getClientIp(request),
      userAgent: deviceInfo.userAgent,
    });

    // Send corresponding email to user
    const userEmail = targetUser.email;
    const userFName = targetUser.firstName;
    const userRoleText = targetUser.role;
    
    if (status === UserStatus.ACTIVE) {
      await sendAccountApproved(userEmail, userFName, userRoleText);
    } else if (status === UserStatus.SUSPENDED) {
      await sendAccountSuspended(userEmail, userFName, reason || 'Violation of terms.');
    } else if (status === UserStatus.BANNED) {
      // Treating BANNED as a sort of rejection/ban
      await sendAccountBanned(userEmail, userFName, reason || 'Severe violation of terms.');
    }

    return createApiResponse(true, {
      ...targetUser.toObject(),
      _id: String(targetUser._id),
      fullName: `${targetUser.firstName} ${targetUser.lastName}`,
    }, `User status updated to ${status}.`, 200);
  } catch (error: unknown) {
    console.error('PATCH /api/admin/users/[uid]/status error:', error);
    return createApiResponse(false, null, 'Failed to update user status.', 500);
  }
}
