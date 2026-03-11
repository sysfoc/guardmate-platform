import { NextRequest } from 'next/server';
import { verifyAndGetUser, getClientIp, getDeviceInfo, createApiResponse } from '@/lib/serverAuth';
import User from '@/models/User.model';

export async function POST(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request. Token invalid or user not found.', 401);
    }

    const { decodedToken } = authContext;
    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    // Push standard metadata maintaining a slice limit of 10
    await User.updateOne(
      { uid: decodedToken.uid },
      {
        $set: {
          lastLoginAt: new Date().toISOString(),
          lastLoginIp: ip,
          lastLoginDevice: device,
          lastLoginUserAgent: userAgent,
        },
        $push: {
          loginHistory: {
            $each: [{
              ip,
              device,
              userAgent,
              timestamp: new Date().toISOString(),
              success: true
            }],
            $slice: -10 
          }
        }
      }
    );

    return createApiResponse(true, null, 'Login metadata updated successfully.', 200);

  } catch (error: any) {
    console.error('Update Login Meta API Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred updating metadata.', 500);
  }
}
