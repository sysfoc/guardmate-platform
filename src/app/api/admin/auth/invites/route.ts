import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import AdminInvite from '@/models/AdminInvite.model';
import User from '@/models/User.model';
import { UserRole, AdminLevel } from '@/types/enums';

// ─── GET /api/admin/auth/invites ──────────────────────────────────────────────
// List all admin invites + current admins (SUPER admins only)

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  if (auth.user.adminLevel !== AdminLevel.SUPER) {
    return createApiResponse(false, null, 'Only Super Admins can view admin management.', 403);
  }

  try {
    await connectDB();

    // Get pending invites
    const pendingInvites = await AdminInvite.find({
      used: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get used invites (last 20)
    const usedInvites = await AdminInvite.find({ used: true })
      .sort({ usedAt: -1 })
      .limit(20)
      .lean();

    // Get current admins
    const admins = await User.find({ role: UserRole.ADMIN })
      .select('uid email firstName lastName adminLevel profilePhoto status createdAt lastLoginAt')
      .sort({ createdAt: 1 })
      .lean();

    return createApiResponse(true, {
      pendingInvites: pendingInvites.map((inv) => ({
        id: inv._id,
        email: inv.email,
        invitedByName: inv.invitedByName,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
      usedInvites: usedInvites.map((inv) => ({
        id: inv._id,
        email: inv.email,
        invitedByName: inv.invitedByName,
        usedAt: inv.usedAt,
        createdAt: inv.createdAt,
      })),
      admins: admins.map((a) => ({
        uid: a.uid,
        email: a.email,
        firstName: a.firstName,
        lastName: a.lastName,
        adminLevel: a.adminLevel,
        profilePhoto: a.profilePhoto,
        status: a.status,
        createdAt: a.createdAt,
        lastLoginAt: a.lastLoginAt,
      })),
    }, 'Admin management data retrieved.', 200);

  } catch (error: unknown) {
    console.error('GET /api/admin/auth/invites error:', error);
    return createApiResponse(false, null, 'Failed to fetch admin data.', 500);
  }
}
