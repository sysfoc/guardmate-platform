import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import EmailSettings from '@/models/EmailSettings.model';
import EmailTemplate from '@/models/EmailTemplate.model';
import { UserRole } from '@/types/enums';
import { defaultTemplates } from '@/lib/email/defaultTemplates';

async function seedDefaultsIfMissing() {
  await connectDB();
  
  // Seed Settings
  const settingsCount = await EmailSettings.countDocuments();
  if (settingsCount === 0) {
    await EmailSettings.create({
      gmailUser: '',
      gmailAppPassword: '',
      fromName: 'GuardMate',
      fromEmail: '',
      replyTo: '',
      isConfigured: false,
    });
  }

  // Seed Templates
  const templateCount = await EmailTemplate.countDocuments();
  if (templateCount === 0) {
    const templatesToInsert = Object.values(defaultTemplates);
    await EmailTemplate.insertMany(templatesToInsert);
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized', 403);
  }

  try {
    await seedDefaultsIfMissing();
    const settings = await EmailSettings.findOne().lean();
    
    if (!settings) throw new Error('Failed to load settings');

    // Mask password
    if (settings.gmailAppPassword) {
      settings.gmailAppPassword = '****************';
    }

    return createApiResponse(true, settings, 'Fetched email settings', 200);
  } catch (error: any) {
    console.error('Error fetching email settings:', error);
    return createApiResponse(false, null, 'Failed to fetch settings', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized', 403);
  }

  try {
    await connectDB();
    const body = await request.json();
    
    const updateData: any = {
      gmailUser: body.gmailUser,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo,
      notifications: body.notifications,
      isConfigured: true,
    };

    // Only update app password if they changed it
    if (body.gmailAppPassword && !body.gmailAppPassword.includes('********')) {
      updateData.gmailAppPassword = body.gmailAppPassword;
    }

    const updated = await EmailSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    ).lean();

    if (updated && updated.gmailAppPassword) {
      updated.gmailAppPassword = '****************';
    }

    return createApiResponse(true, updated, 'Email settings updated successfully', 200);
  } catch (error: any) {
    console.error('Error updating email settings:', error);
    return createApiResponse(false, null, 'Failed to update settings', 500);
  }
}
