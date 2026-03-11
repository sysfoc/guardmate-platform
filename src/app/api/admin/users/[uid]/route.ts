import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { UserRole } from '@/types/enums';

// ─── GET /api/admin/users/[uid] ───────────────────────────────────────────────

export async function GET(
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

    const user = await User.findOne({ uid }).lean();

    if (!user) {
      return createApiResponse(false, null, 'User not found.', 404);
    }

    const serialized = {
      ...user,
      _id: String(user._id),
      fullName: `${user.firstName} ${user.lastName}`,
      createdAt: user.createdAt ? new Date(user.createdAt as string).toISOString() : '',
      updatedAt: user.updatedAt ? new Date(user.updatedAt as string).toISOString() : '',
    };

    return createApiResponse(true, serialized, 'User profile fetched.', 200);
  } catch (error: unknown) {
    console.error('GET /api/admin/users/[uid] error:', error);
    return createApiResponse(false, null, 'Failed to fetch user profile.', 500);
  }
}
