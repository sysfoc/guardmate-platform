import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { getIdTokenFromHeader, createApiResponse } from '@/lib/serverAuth';

/**
 * DEVELOPMENT ONLY: Hard-verifies the current user in both Firebase and MongoDB.
 * Useful for testing when SMTP/Firebase Email isn't configured or reliable on localhost.
 */
export async function POST(request: NextRequest) {
  // Security check: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return createApiResponse(false, null, 'Not available in production.', 403);
  }

  try {
    const token = getIdTokenFromHeader(request);
    if (!token) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    // 1. Verify and Decode Token using Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 2. Update Firebase User Status
    await adminAuth.updateUser(uid, {
      emailVerified: true,
    });

    // 3. Update MongoDB User Status
    await connectDB();
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      { emailVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      return createApiResponse(false, null, 'User not found in database.', 404);
    }

    return createApiResponse(true, { uid, email: updatedUser.email }, 'Development verification successful.', 200);
  } catch (error: any) {
    console.error('Verify Debug API Error:', error);
    return createApiResponse(false, null, error.message || 'Internal server error.', 500);
  }
}
