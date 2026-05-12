import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole, SubscriptionStatus } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';
import { getStripeInstance } from '@/lib/payments/stripeClient';

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

    // Fetch current settings before update to detect changes
    const oldSettings = await PlatformSettings.findOne().lean();

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      platformCountry: body.platformCountry,
      platformCurrency: body.platformCurrency,
      abrGuid: body.abrGuid,
      abrVerificationEnabled: body.abrVerificationEnabled,
      // Commission & Withdrawal Settings
      platformCommissionBoss: body.platformCommissionBoss,
      platformCommissionGuard: body.platformCommissionGuard,
      minimumWithdrawalAmount: body.minimumWithdrawalAmount,
      // Stripe Settings
      stripeEnabled: body.stripeEnabled,
      stripePublishableKey: body.stripePublishableKey,
      stripeSecretKey: body.stripeSecretKey,
      stripeWebhookSecret: body.stripeWebhookSecret,
      // PayPal Settings
      paypalEnabled: body.paypalEnabled,
      paypalClientId: body.paypalClientId,
      paypalClientSecret: body.paypalClientSecret,
      paypalWebhookId: body.paypalWebhookId,
      paypalMode: body.paypalMode,
      // Boss Subscription Settings
      bossSubscriptionEnabled: body.bossSubscriptionEnabled,
      bossSubscriptionAmount: body.bossSubscriptionAmount,
      bossSubscriptionCurrency: body.bossSubscriptionCurrency,
    };

    // Handle minimum rate enforcement fields
    if (body.minimumRateEnforced !== undefined) {
      updatePayload.minimumRateEnforced = body.minimumRateEnforced;
    }

    // Validate subscription settings
    if (body.bossSubscriptionEnabled === true) {
      const amount = body.bossSubscriptionAmount;
      if (amount === null || amount === undefined || amount <= 0) {
        return createApiResponse(false, null, 'Subscription amount must be greater than 0 when subscriptions are enabled.', 400);
      }
    }

    // When saving minimum rates, update audit fields
    if (body.minimumHourlyRate !== undefined) {
      updatePayload.minimumHourlyRate = body.minimumHourlyRate;
      // Update audit fields when rates are changed
      updatePayload.minimumRateLastUpdatedAt = new Date();
      updatePayload.minimumRateLastUpdatedBy = auth.user.uid;
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: updatePayload },
      { new: true, upsert: true }
    ).lean();

    // ── Proactively update active Stripe subscriptions if amount changed ───────
    let priceChangeSummary: string | null = null;
    if (
      body.bossSubscriptionAmount !== undefined &&
      body.bossSubscriptionAmount > 0 &&
      settings?.stripeEnabled &&
      settings?.stripeSecretKey
    ) {
      const oldAmount = oldSettings?.bossSubscriptionAmount ?? 0;
      const newAmount = body.bossSubscriptionAmount;

      if (oldAmount !== newAmount) {
        try {
          const stripe = await getStripeInstance();
          const newAmountInCents = Math.round(newAmount * 100);

          const products = await stripe.products.search({
            query: `metadata['app']:'guardmate' AND metadata['type']:'boss_subscription'`,
          });
          const product = products.data[0];

          if (!product) {
            console.warn('[admin/settings] ⚠️ Stripe product not found; cannot update existing subscriptions');
          } else {
            const newPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: newAmountInCents,
              currency: 'aud',
              recurring: { interval: 'month' },
            });

            const BossSubscription = (await import('@/models/BossSubscription.model')).default;
            const activeSubs = await BossSubscription.find({
              status: SubscriptionStatus.ACTIVE,
              stripeSubscriptionId: { $ne: null },
            }).lean();

            let updatedCount = 0;
            for (const sub of activeSubs) {
              try {
                const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId as string);
                const itemId = stripeSub.items.data[0]?.id;
                if (itemId) {
                  await stripe.subscriptions.update(sub.stripeSubscriptionId as string, {
                    items: [{ id: itemId, price: newPrice.id }],
                    proration_behavior: 'none',
                  });
                  await BossSubscription.updateOne(
                    { _id: sub._id },
                    { $set: { amount: newAmount, stripePriceId: newPrice.id } }
                  );
                  updatedCount++;
                }
              } catch (subErr: any) {
                console.error(`[admin/settings] ❌ Failed to update subscription ${sub.stripeSubscriptionId}:`, subErr.message);
              }
            }

            priceChangeSummary = `Updated ${updatedCount} active Stripe subscriptions to new price $${newAmount.toFixed(2)} AUD.`;
            console.log('[admin/settings] ✅', priceChangeSummary);
          }
        } catch (updateErr: any) {
          console.error('[admin/settings] ❌ Error updating active subscription prices:', updateErr.message);
        }
      }
    }

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
    if (priceChangeSummary) {
      detailsParts.push(priceChangeSummary);
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
