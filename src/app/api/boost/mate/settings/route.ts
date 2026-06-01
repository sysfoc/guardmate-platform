import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';
import { createApiResponse } from '@/lib/serverAuth';

/**
 * GET /api/boost/mate/settings
 * Public — returns guard boost configuration (fee, duration, enabled flag).
 */
export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    const settings = await PlatformSettings.findOne().lean();

    return createApiResponse(true, {
      mateBoostEnabled: settings?.mateBoostEnabled ?? false,
      mateBoostFee: settings?.mateBoostFee ?? 9.99,
      mateBoostDurationDays: settings?.mateBoostDurationDays ?? 7,
      currency: settings?.platformCurrency || 'AUD',
    }, 'Boost settings fetched.', 200);
  } catch (error: unknown) {
    console.error('GET /api/boost/mate/settings error:', error);
    return createApiResponse(false, null, 'Failed to fetch boost settings.', 500);
  }
}
