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
import { UserRole, UserStatus, AuthProvider } from '@/types/user.types';

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

    const body = await request.json();
    const { role, firstName, lastName } = body;

    if (!role || (role !== UserRole.BOSS && role !== UserRole.MATE)) {
      return createApiResponse(false, null, 'Invalid or missing role parameter.', 400);
    }

    if (!firstName || !lastName) {
      return createApiResponse(false, null, 'First name and last name are required.', 400);
    }

    await connectDB();

    const existingUser = await User.findOne({ uid: decodedToken.uid });
    if (existingUser) {
      return createApiResponse(false, null, 'User profile already exists and cannot be reassigned.', 409);
    }

    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    // Create the new Google user with PENDING status
    const newUser = await User.create({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      authProvider: AuthProvider.GOOGLE,
      role,
      status: UserStatus.PENDING,
      firstName,
      lastName,
      profilePhoto: decodedToken.picture || null,
      registrationIp: ip,
      registrationDevice: device,
      lastLoginAt: new Date().toISOString(),
      lastLoginIp: ip,
      lastLoginDevice: device,
      lastLoginUserAgent: userAgent,
      loginHistory: [{
        ip,
        device,
        userAgent,
        timestamp: new Date().toISOString(),
        success: true
      }],
      isProfileComplete: false,
      isOnboardingComplete: false,
      isTwoFactorEnabled: false
    });

    const { loginHistory, ...sanitizedUser } = newUser.toObject();

    const response = createApiResponse(true, sanitizedUser, 'Registration successful. Account pending setup.', 201);

    // Set role cookie for Edge Middleware
    response.cookies.set('__role', role, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 14 // 14 days
    });

    return response;
  } catch (error: any) {
    console.error('Assign Role API Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred during role assignment.', 500);
  }
}
