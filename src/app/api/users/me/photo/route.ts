import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/users/me/photo
 * Uploads a profile photo and saves it to public/uploads/photos/.
 * Returns the URL to be used in the profile update.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request.', 401);
    }

    const { user } = authContext;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate inputs
    if (!file) {
      return createApiResponse(false, null, 'File is required.', 400);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return createApiResponse(false, null, 'Invalid file type. Allowed: PNG, JPG, JPEG, WEBP.', 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return createApiResponse(false, null, 'File size exceeds 5MB limit.', 400);
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'photos');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename: uid_timestamp_originalname
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${user.uid}_${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, uniqueName);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Build URL path (served by Next.js from public/)
    const url = `/uploads/photos/${uniqueName}`;

    // Update user's profile photo in MongoDB as a convenience, though the client will also PATCH it
    await connectDB();
    await User.findOneAndUpdate(
      { uid: user.uid },
      { $set: { profilePhoto: url, updatedAt: new Date().toISOString() } },
      { new: true }
    );

    return createApiResponse(true, { url }, 'Profile photo uploaded successfully.', 200);
  } catch (error: any) {
    console.error('POST /api/users/me/photo Error:', error);
    return createApiResponse(false, null, 'Failed to upload photo.', 500);
  }
}
