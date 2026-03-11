import { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { createApiResponse, getIdTokenFromHeader } from '@/lib/serverAuth';

/**
 * GET /api/users/[uid]
 * Fetches a public version of a user profile by their Firebase UID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> | { uid: string } }
) {
  try {
    const resolvedParams = await params;
    const { uid } = resolvedParams;

    if (!uid) {
      return createApiResponse(false, null, 'User UID is required.', 400);
    }

    // Optional: Check if requester is authenticated to see more details
    const token = getIdTokenFromHeader(request);
    const decodedToken = token ? await verifyFirebaseToken(token) : null;
    const isOwner = decodedToken?.uid === uid;

    await connectDB();
    const user = await User.findOne({ uid });

    if (!user) {
      return createApiResponse(false, null, 'User not found.', 404);
    }

    const {
      loginHistory,
      registrationIp,
      registrationDevice,
      lastLoginIp,
      lastLoginDevice,
      lastLoginUserAgent,
      ...scrubbedProfile
    } = user.toObject();

    let finalProfile = scrubbedProfile;

    // If not the owner or admin, remove private contact/status info
    // (Adjust permissions as needed for GuardMate's specific business logic)
    if (!isOwner) {
      // For now, keep it simple: just return public fields
      // const { phone, email, ...publicProfile } = finalProfile;
      // finalProfile = publicProfile;
    }

    return createApiResponse(true, finalProfile, 'User profile fetched.', 200);

  } catch (error: any) {
    console.error(`API GET /users Error:`, error);
    return createApiResponse(false, null, 'Internal server error.', 500);
  }
}
