import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import Job from '@/models/Job.model';
import { UserRole, UserStatus, JobStatus } from '@/types/enums';

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    await connectDB();

    const [totalGuards, totalBosses, pendingApprovals, activeUsers, suspendedUsers, totalJobsPosted, activeJobs] =
      await Promise.all([
        User.countDocuments({ role: UserRole.MATE }),
        User.countDocuments({ role: UserRole.BOSS }),
        User.countDocuments({ status: UserStatus.PENDING }),
        User.countDocuments({ status: UserStatus.ACTIVE }),
        User.countDocuments({ status: UserStatus.SUSPENDED }),
        Job.countDocuments(),
        Job.countDocuments({ status: { $in: [JobStatus.OPEN, JobStatus.FILLED, JobStatus.IN_PROGRESS] } }),
      ]);

    // Recent 5 pending users
    const recentPending = await User.find({ status: UserStatus.PENDING })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('uid firstName lastName email role status profilePhoto createdAt')
      .lean();

    // Recent 10 admin activities
    const AdminActivity = (await import('@/models/AdminActivity.model')).default;
    const recentActivity = await AdminActivity.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const stats = {
      totalGuards,
      totalBosses,
      pendingApprovals,
      activeUsers,
      suspendedUsers,
      totalRevenue: 0, // placeholder
      totalJobsPosted,
      activeJobs,
      recentPending: recentPending.map((u) => ({
        _id: String(u._id),
        uid: u.uid,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        status: u.status,
        profilePhoto: u.profilePhoto ?? null,
        createdAt: u.createdAt ? new Date(u.createdAt as string).toISOString() : '',
      })),
      recentActivity: recentActivity.map((a) => ({
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
      })),
    };

    return createApiResponse(true, stats, 'Admin stats fetched.', 200);
  } catch (error: unknown) {
    console.error('GET /api/admin/stats error:', error);
    return createApiResponse(false, null, 'Failed to fetch admin stats.', 500);
  }
}
