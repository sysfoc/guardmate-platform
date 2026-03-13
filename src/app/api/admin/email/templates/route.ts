import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import EmailTemplate from '@/models/EmailTemplate.model';
import { UserRole } from '@/types/enums';

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized', 403);
  }

  try {
    await connectDB();
    const templates = await EmailTemplate.find().sort({ notificationType: 1 }).lean();
    return createApiResponse(true, templates, 'Templates fetched', 200);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return createApiResponse(false, null, 'Failed to fetch templates', 500);
  }
}
