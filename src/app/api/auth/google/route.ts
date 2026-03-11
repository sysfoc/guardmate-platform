import { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { 
  getIdTokenFromHeader, 
  getClientIp, 
  getDeviceInfo, 
  createApiResponse 
} from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const token = getIdTokenFromHeader(request);
    if (!token) {
      return createApiResponse(false, null, 'Unauthorized request. Missing token.', 401);
    }

    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken) {
      return createApiResponse(false, null, 'Invalid or expired authentication token.', 401);
    }

    await connectDB();

    const user = await User.findOne({ uid: decodedToken.uid });
    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    if (user) {
      // User exists — Push strict metadata directly to the database without triggering validation hooks
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
              $slice: -10 // Keep only last 10 entries for efficiency
            }
          }
        }
      );

      // Return existing user without history
      const updatedUser = await User.findOne({ uid: decodedToken.uid }).select('-loginHistory');
      
      const response = createApiResponse(true, { isNewUser: false, user: updatedUser }, 'Login successful', 200);
      
      // Set role cookie for Edge Middleware
      response.cookies.set('__role', user.role, {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 14
      });

      return response;
    } else {
      // User does NOT exist in MongoDB. 
      // Do NOT create the document here. Return isNewUser=true so the client can route to the onboarding flow (/role-select)
      return createApiResponse(true, { user: null, isNewUser: true }, 'New Google authorization successful. Missing role profile.', 200);
    }

  } catch (error: any) {
    console.error('Google Auth API Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred during Google Auth.', 500);
  }
}
