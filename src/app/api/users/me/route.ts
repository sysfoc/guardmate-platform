import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';

/**
 * GET /api/users/me
 * Returns the currently authenticated user's full MongoDB profile.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request.', 401);
    }

    const { user } = authContext;
    const { loginHistory, ...profileData } = user.toObject();
    
    return createApiResponse(true, profileData, 'Profile fetched successfully.', 200);
  } catch (error: any) {
    console.error('API GET /users/me Error:', error);
    return createApiResponse(false, null, 'Internal server error.', 500);
  }
}

/**
 * PATCH /api/users/me
 * Updates the currently authenticated user's profile fields.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request.', 401);
    }

    const { user, decodedToken } = authContext;
    const body = await request.json();
    console.log("[DEBUG API] PATCH /users/me body received:", body);

    // Prevent overwriting sensitive fields that should only be changed via specialized flows
    const protectedFields = ['_id', 'uid', 'email', 'role', 'status', 'authProvider', 'createdAt', 'updatedAt'];
    protectedFields.forEach(field => delete body[field]);

    await connectDB();

    // ── Phone country lock enforcement (grandfather policy) ───────────────
    // When the admin has configured a platform country, clients may only
    // submit `phoneCountryCode` values that are EITHER:
    //   (a) the current platform country, OR
    //   (b) the user's already-saved country (grandfathered).
    // Any other value is rejected to prevent bypassing the lock from a
    // malicious client.
    if (Object.prototype.hasOwnProperty.call(body, 'phoneCountryCode')) {
      const submitted: string | null = body.phoneCountryCode ?? null;
      if (submitted) {
        const settings = await PlatformSettings.findOne().lean() as { platformCountry?: { countryCode?: string } | null } | null;
        const platformCode = settings?.platformCountry?.countryCode ?? null;
        const savedCode = user.phoneCountryCode ?? null;
        if (platformCode && submitted !== platformCode && submitted !== savedCode) {
          return createApiResponse(
            false,
            null,
            'Phone country must match the platform country or your existing country.',
            400,
          );
        }
      }
    }

    // Perform update
    const updatedUser = await User.findOneAndUpdate(
      { uid: decodedToken.uid },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return createApiResponse(false, null, 'User not found in database.', 404);
    }

    const { loginHistory, ...sanitizedUser } = updatedUser.toObject();

    return createApiResponse(true, sanitizedUser, 'Profile updated successfully.', 200);
  } catch (error: any) {
    console.error('API PATCH /users/me Error:', error);
    
    if (error.name === 'ValidationError') {
      return createApiResponse(false, null, error.message, 400);
    }
    
    return createApiResponse(false, null, 'Internal server error.', 500);
  }
}
