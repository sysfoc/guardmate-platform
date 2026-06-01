import { NextRequest, NextResponse } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import BoostPayment from '@/models/BoostPayment.model';
import { getStripeInstance } from '@/lib/payments/stripeClient';
import { UserRole, UserStatus, LicenseStatus } from '@/types/enums';

/**
 * POST /api/boost/mate/create-intent
 * Mate only — create a Stripe PaymentIntent to boost their profile.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only Mate accounts can boost their profile.', 403);
    }

    if (user.status !== UserStatus.ACTIVE) {
      return createApiResponse(false, null, 'Your account must be ACTIVE to boost your profile.', 403);
    }

    if (user.licenseStatus !== LicenseStatus.VALID) {
      return createApiResponse(false, null, 'Your SIA license must be VALID to boost your profile.', 403);
    }

    await connectDB();

    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.mateBoostEnabled) {
      return createApiResponse(false, null, 'Profile boosting is not currently available.', 400);
    }

    if (!settings?.stripeEnabled) {
      return createApiResponse(false, null, 'Stripe payments are not enabled on this platform.', 400);
    }

    const now = new Date();
    const guardUser = await User.findOne({ uid: user.uid }).lean();
    if (guardUser?.isFeatured && guardUser?.featuredUntil && new Date(guardUser.featuredUntil) > now) {
      return createApiResponse(
        false,
        null,
        `Your profile is already boosted until ${new Date(guardUser.featuredUntil).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        400
      );
    }

    // Prevent duplicate payment intents (race condition / double-click)
    const existingPending = await BoostPayment.findOne({
      guardUid: user.uid,
      status: 'PENDING',
    });
    if (existingPending) {
      return createApiResponse(
        false,
        null,
        'You already have a pending boost payment. Please complete it or wait for it to expire.',
        400
      );
    }

    const fee = settings.mateBoostFee ?? 9.99;
    const durationDays = settings.mateBoostDurationDays ?? 7;
    const currency = settings.platformCurrency || 'AUD';

    const boostPayment = await BoostPayment.create({
      guardUid: user.uid,
      amount: fee,
      currency,
      durationDays,
      boostedUntil: null,
      status: 'PENDING',
      stripePaymentIntentId: null,
    });

    const stripe = await getStripeInstance();
    const amountInCents = Math.round(fee * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        boostPaymentId: boostPayment._id.toString(),
        guardUid: user.uid,
        type: 'MATE_BOOST',
      },
    });

    boostPayment.stripePaymentIntentId = paymentIntent.id;
    await boostPayment.save();

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        fee,
        durationDays,
        currency,
      },
      message: 'Boost payment intent created.',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Failed to create boost payment intent.';
    console.error('POST /api/boost/mate/create-intent error:', error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
