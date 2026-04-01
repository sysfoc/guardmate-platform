import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';

async function seedSettingsIfMissing() {
  await connectDB();
  const count = await PlatformSettings.countDocuments();
  if (count === 0) {
    await PlatformSettings.create({
      platformCountry: null,
    });
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
    
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { 
        $set: { 
          platformCountry: body.platformCountry,
          abrGuid: body.abrGuid,
          abrVerificationEnabled: body.abrVerificationEnabled,
        } 
      },
      { new: true, upsert: true }
    ).lean();

    // Log Activity
    const deviceInfo = getDeviceInfo(request);
    await AdminActivity.create({
      adminUid: auth.user.uid,
      adminName: `${auth.user.firstName} ${auth.user.lastName}`,
      actionType: AdminActionType.SYSTEM_SETTING_UPDATE,
      targetType: 'SETTING',
      targetId: String(settings._id || 'platform-settings'),
      targetName: `Platform Settings Update`,
      details: `Updated platform settings: ${body.platformCountry ? `Country: ${body.platformCountry.countryName}` : ''} ABR Verification: ${body.abrVerificationEnabled ? 'Enabled' : 'Disabled'} ABR GUID: ${body.abrGuid}`,
      ipAddress: getClientIp(request),
      userAgent: deviceInfo.userAgent,
    });

    return createApiResponse(true, settings, 'Platform settings updated successfully', 200);
  } catch (error: any) {
    console.error('Error updating platform settings:', error);
    return createApiResponse(false, null, 'Failed to update settings', 500);
  }
}
