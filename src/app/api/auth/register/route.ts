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
import { sendGuardSignupAlert, sendBossSignupAlert } from '@/lib/email/emailTriggers';


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
    const { role, firstName, lastName, phone, phoneCountryCode } = body;

    if (!role || (role !== UserRole.BOSS && role !== UserRole.MATE)) {
      return createApiResponse(false, null, 'Invalid or missing role parameter.', 400);
    }

    if (!firstName || !lastName) {
      return createApiResponse(false, null, 'First name and last name are required.', 400);
    }

    await connectDB();

    // Check existing User by Email or UID
    const existingUser = await User.findOne({
      $or: [{ uid: decodedToken.uid }, { email: decodedToken.email }]
    });

    if (existingUser) {
      return createApiResponse(false, null, 'A user account is already associated with this email or UID.', 409);
    }

    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    // Create the new user with PENDING status
    const newUser = await User.create({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      authProvider: AuthProvider.EMAIL,
      role,
      status: UserStatus.PENDING,
      firstName,
      lastName,
      phone: phone || null,
      phoneCountryCode: phoneCountryCode || null,
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
      // Pre-fill fields to prevent DB errors
      isProfileComplete: false,
      isOnboardingComplete: false,
      isTwoFactorEnabled: false
    });

    // Sanitize output, exclude history, etc.
    const { loginHistory, ...sanitizedUser } = newUser.toObject();

    // Trigger Admin Emails
    if (role === UserRole.MATE) {
      await sendGuardSignupAlert('admin@guardmate.com', firstName, decodedToken.email || ''); // Replace with real admin email later if needed
    } else if (role === UserRole.BOSS) {
      await sendBossSignupAlert('admin@guardmate.com', firstName, 'New Company', decodedToken.email || '');
    }

    const response = createApiResponse(true, sanitizedUser, 'Role assignment and registration successful.', 201);
    
    // Set role cookie for Edge Middleware
    response.cookies.set('__role', role, {
      path: '/',
      httpOnly: false, // Middleware needs to read this
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 14 // 14 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred during registration.', 500);
  }
}
