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

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      platformCountry: body.platformCountry,
      abrGuid: body.abrGuid,
      abrVerificationEnabled: body.abrVerificationEnabled,
    };

    // Handle minimum rate enforcement fields
    if (body.minimumRateEnforced !== undefined) {
      updatePayload.minimumRateEnforced = body.minimumRateEnforced;
    }

    // When saving minimum rates, update audit fields
    if (body.minimumHourlyRate !== undefined || body.minimumFixedRate !== undefined) {
      if (body.minimumHourlyRate !== undefined) {
        updatePayload.minimumHourlyRate = body.minimumHourlyRate;
      }
      if (body.minimumFixedRate !== undefined) {
        updatePayload.minimumFixedRate = body.minimumFixedRate;
      }
      // Update audit fields when rates are changed
      updatePayload.minimumRateLastUpdatedAt = new Date();
      updatePayload.minimumRateLastUpdatedBy = auth.user.uid;
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: updatePayload },
      { new: true, upsert: true }
    ).lean();

    // Log Activity
    const deviceInfo = getDeviceInfo(request);
    const detailsParts: string[] = [];
    if (body.platformCountry) {
      detailsParts.push(`Country: ${body.platformCountry.countryName}`);
    }
    if (body.abrVerificationEnabled !== undefined) {
      detailsParts.push(`ABR Verification: ${body.abrVerificationEnabled ? 'Enabled' : 'Disabled'}`);
    }
    if (body.abrGuid) {
      detailsParts.push(`ABR GUID: ${body.abrGuid}`);
    }
    if (body.minimumRateEnforced !== undefined) {
      detailsParts.push(`Minimum Rate Enforcement: ${body.minimumRateEnforced ? 'Enabled' : 'Disabled'}`);
    }
    if (body.minimumHourlyRate !== undefined) {
      detailsParts.push(`Minimum Hourly Rate: ${body.minimumHourlyRate}`);
    }
    if (body.minimumFixedRate !== undefined) {
      detailsParts.push(`Minimum Fixed Rate: ${body.minimumFixedRate}`);
    }

    await AdminActivity.create({
      adminUid: auth.user.uid,
      adminName: `${auth.user.firstName} ${auth.user.lastName}`,
      actionType: AdminActionType.SYSTEM_SETTING_UPDATE,
      targetType: 'SETTING',
      targetId: String(settings._id || 'platform-settings'),
      targetName: `Platform Settings Update`,
      details: `Updated platform settings: ${detailsParts.join(' ')}`,
      ipAddress: getClientIp(request),
      userAgent: deviceInfo.userAgent,
    });

    return createApiResponse(true, settings, 'Platform settings updated successfully', 200);
  } catch (error: any) {
    console.error('Error updating platform settings:', error);
    return createApiResponse(false, null, 'Failed to update settings', 500);
  }
}
