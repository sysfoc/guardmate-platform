import { NextRequest } from 'next/server';
import { createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminOtp from '@/models/AdminOtp.model';
import { UserRole } from '@/types/enums';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

// ─── POST /api/admin/auth/verify-otp ──────────────────────────────────────────
// Step 2 of admin login: verify OTP, generate Firebase custom token

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return createApiResponse(false, null, 'Email and verification code are required.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    // ── 1. Find the latest unused OTP for this email ──────────────────────────
    const otp = await AdminOtp.findOne({
      email: normalizedEmail,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      return createApiResponse(false, null, 'Verification code expired or not found. Please request a new one.', 401);
    }

    // ── 2. Check attempt limit ────────────────────────────────────────────────
    if (otp.attempts >= 5) {
      otp.used = true;
      await otp.save();
      return createApiResponse(false, null, 'Too many failed attempts. Please request a new code.', 429);
    }

    // ── 3. Increment attempts and verify code ─────────────────────────────────
    otp.attempts += 1;

    if (otp.code !== code.trim()) {
      await otp.save();
      const remaining = 5 - otp.attempts;
      return createApiResponse(
        false,
        null,
        `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        401
      );
    }

    // ── 4. OTP matches — mark as used ─────────────────────────────────────────
    otp.used = true;
    await otp.save();

    // ── 5. Verify the user is still an admin ──────────────────────────────────
    const user = await User.findOne({ email: normalizedEmail, role: UserRole.ADMIN });
    if (!user) {
      return createApiResponse(false, null, 'Account not found or access revoked.', 403);
    }

    // ── 6. Generate Firebase Custom Token ─────────────────────────────────────
    // This allows the client to sign in without knowing the password
    const customToken = await adminAuth.createCustomToken(user.uid, {
      role: UserRole.ADMIN,
      adminLevel: user.adminLevel,
    });

    // ── 7. Update login metadata ──────────────────────────────────────────────
    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    await User.updateOne(
      { uid: user.uid },
      {
        $set: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          lastLoginDevice: device,
          lastLoginUserAgent: userAgent,
        },
        // Update the last login history entry to mark it successful
        $push: {
          loginHistory: {
            $each: [{
              ip,
              device,
              userAgent,
              timestamp: new Date(),
              success: true,
            }],
            $slice: -50,
          },
        },
      }
    );

    // ── 8. Build response with user data + cookies ────────────────────────────
    const response = createApiResponse(true, {
      customToken,
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        adminLevel: user.adminLevel,
        profilePhoto: user.profilePhoto,
      },
    }, 'Login successful.', 200);

    // Set auth cookies for middleware
    const cookieOptions = {
      path: '/',
      httpOnly: false, // Middleware needs to read
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 14, // 14 days
    };

    response.cookies.set('__role', UserRole.ADMIN, cookieOptions);
    response.cookies.set('__status', user.status, cookieOptions);
    response.cookies.set('__onboarding_complete', 'true', cookieOptions);

    return response;

  } catch (error: unknown) {
    console.error('POST /api/admin/auth/verify-otp error:', error);
    return createApiResponse(false, null, 'Verification failed. Please try again.', 500);
  }
}
