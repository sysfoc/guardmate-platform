import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';

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
