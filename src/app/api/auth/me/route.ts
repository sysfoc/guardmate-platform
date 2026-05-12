import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request. Token invalid or user not found.', 401);
    }

    const { decodedToken, user } = authContext;

    // NOTE: lastLoginAt is updated by updateLoginMeta() after actual login,
    // NOT here. Previously this did a DB write on every /me call (every page load)
    // which added ~50-200ms latency per navigation.

    const profileData = user.toObject();
    
    // Secure history deletion
    delete profileData.loginHistory;
    
    return createApiResponse(true, profileData, 'Profile fetched successfully.', 200);

  } catch (error: any) {
    console.error('API /me Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred fetching the profile.', 500);
  }
}
