import { NextRequest } from 'next/server';
import { createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminInvite from '@/models/AdminInvite.model';
import { UserRole, UserStatus, AuthProvider, AdminLevel } from '@/types/enums';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

// ─── POST /api/admin/auth/register ────────────────────────────────────────────
// Invite-only admin registration — creates Firebase user + MongoDB admin doc

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, firstName, lastName, password } = body;

    if (!token) {
      return createApiResponse(false, null, 'Invitation token is required.', 400);
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      return createApiResponse(false, null, 'First name and last name are required.', 400);
    }
    if (!password || password.length < 8) {
      return createApiResponse(false, null, 'Password must be at least 8 characters.', 400);
    }

    await connectDB();

    // ── 1. Validate invite token ──────────────────────────────────────────────
    const invite = await AdminInvite.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return createApiResponse(false, null, 'Invalid or expired invitation. Please request a new invite from an existing admin.', 400);
    }

    // ── 2. Check if email already has an account ──────────────────────────────
    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) {
      // Mark invite as used since the email is taken
      invite.used = true;
      invite.usedAt = new Date();
      await invite.save();
      return createApiResponse(false, null, 'An account with this email already exists.', 409);
    }

    // ── 3. Create Firebase Auth user ──────────────────────────────────────────
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.createUser({
        email: invite.email,
        password,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        emailVerified: true, // Admin accounts are pre-verified
      });
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/email-already-exists') {
        // Firebase user exists but no MongoDB doc — use existing Firebase user
        const existingFbUser = await adminAuth.getUserByEmail(invite.email);
        firebaseUser = existingFbUser;
        // Update their password since they're re-registering
        await adminAuth.updateUser(existingFbUser.uid, {
          password,
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          emailVerified: true,
        });
      } else {
        throw fbErr;
      }
    }

    // ── 4. Create MongoDB user document ───────────────────────────────────────
    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    const newAdmin = await User.create({
      uid: firebaseUser.uid,
      email: invite.email,
      emailVerified: true,
      authProvider: AuthProvider.EMAIL,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      adminLevel: AdminLevel.SUPPORT, // New admins start at SUPPORT level
      permissions: ['MANAGE_USERS', 'VIEW_ANALYTICS', 'VERIFY_LICENSES'],
      assignedBy: invite.invitedBy,
      isProfileComplete: true,
      isOnboardingComplete: true,
      isTwoFactorEnabled: true, // Admin accounts have OTP-based 2FA
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
        success: true,
      }],
    });

    // ── 5. Mark invite as used ────────────────────────────────────────────────
    invite.used = true;
    invite.usedAt = new Date();
    await invite.save();

    // ── 6. Log admin activity ─────────────────────────────────────────────────
    try {
      const AdminActivity = (await import('@/models/AdminActivity.model')).default;
      const { AdminActionType } = await import('@/types/admin.types');
      await AdminActivity.create({
        adminUid: invite.invitedBy,
        adminName: invite.invitedByName,
        actionType: AdminActionType.ADMIN_REGISTER,
        targetType: 'USER',
        targetId: newAdmin.uid,
        targetName: `${firstName.trim()} ${lastName.trim()}`,
        details: `New admin registered via invitation: ${invite.email}`,
        ipAddress: ip,
        userAgent,
      });
    } catch (logErr) {
      console.warn('Failed to log admin registration activity:', logErr);
    }

    return createApiResponse(true, {
      uid: newAdmin.uid,
      email: newAdmin.email,
      firstName: newAdmin.firstName,
      lastName: newAdmin.lastName,
      role: newAdmin.role,
    }, 'Admin account created successfully. You can now sign in.', 201);

  } catch (error: unknown) {
    console.error('POST /api/admin/auth/register error:', error);
    return createApiResponse(false, null, 'Registration failed. Please try again.', 500);
  }
}
