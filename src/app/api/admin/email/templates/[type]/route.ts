import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import EmailTemplate from '@/models/EmailTemplate.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized', 403);
  }

  try {
    await connectDB();
    const resolvedParams = await params;
    const template = await EmailTemplate.findOne({ notificationType: resolvedParams.type }).lean();
    
    if (!template) {
      return createApiResponse(false, null, 'Template not found', 404);
    }
    
    return createApiResponse(true, template, 'Template fetched', 200);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return createApiResponse(false, null, 'Failed to fetch template', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized', 403);
  }

  try {
    await connectDB();
    const body = await request.json();
    const resolvedParams = await params;

    const template = await EmailTemplate.findOneAndUpdate(
      { notificationType: resolvedParams.type },
      {
        $set: {
          subject: body.subject,
          htmlBody: body.htmlBody,
          textBody: body.textBody,
          isActive: body.isActive !== undefined ? body.isActive : true,
          lastEditedBy: auth.user.fullName,
        }
      },
      { new: true }
    ).lean();

    if (!template) {
      return createApiResponse(false, null, 'Template not found', 404);
    }

    // Log Activity
    await AdminActivity.create({
      adminUid: auth.user.uid,
      adminName: auth.user.fullName,
      actionType: AdminActionType.SYSTEM_SETTING_UPDATE,
      targetType: 'SETTING',
      targetId: String(template._id),
      targetName: `EmailTemplate: ${resolvedParams.type}`,
      details: `Updated email template for ${resolvedParams.type}`,
    });

    return createApiResponse(true, template, 'Template updated', 200);
  } catch (error: any) {
    console.error('Error updating template:', error);
    return createApiResponse(false, null, 'Failed to update template', 500);
  }
}
