import { NextRequest } from 'next/server';
import { verifyAndGetUser, getClientIp, createApiResponse } from '@/lib/serverAuth';
import User from '@/models/User.model';

export async function GET(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request. Token invalid or user not found.', 401);
    }

    const { decodedToken, user } = authContext;

    // Silently update standard login times
    await User.updateOne(
      { uid: decodedToken.uid },
      {
        $set: {
          lastLoginAt: new Date().toISOString(),
          lastLoginIp: getClientIp(request),
        }
      }
    );

    const profileData = user.toObject();
    
    // Secure history deletion
    delete profileData.loginHistory;
    
    return createApiResponse(true, profileData, 'Profile fetched successfully.', 200);

  } catch (error: any) {
    console.error('API /me Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred fetching the profile.', 500);
  }
}
