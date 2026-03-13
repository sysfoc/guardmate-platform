import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';

async function seedSettingsIfMissing() {
  await connectDB();
  const count = await PlatformSettings.countDocuments();
  if (count === 0) {
    await PlatformSettings.create({
      platformCountry: null,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    await seedSettingsIfMissing();
    const settings = await PlatformSettings.findOne().lean();
    
    if (!settings) throw new Error('Failed to load platform settings');

    return createApiResponse(true, settings, 'Fetched platform settings', 200);
  } catch (error: any) {
    console.error('Error fetching platform settings:', error);
    return createApiResponse(false, null, 'Failed to fetch settings', 500);
  }
}
