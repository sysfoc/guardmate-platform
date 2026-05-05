import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';
import BossSubscription from '@/models/BossSubscription.model';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import { SubscriptionStatus } from '@/types/enums';
import { getPayPalAccessToken, getPayPalConfig } from '@/lib/payments/paypalClient';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/create-paypal
// Creates a PayPal Billing Subscription with auto-recurring monthly charges.
// Returns approvalUrl for Boss redirect to PayPal for payment.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyFirebaseToken(authHeader.split('Bearer ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const bossUid = decoded.uid;

    // ── Platform Settings ──────────────────────────────────────────────────
    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.bossSubscriptionEnabled) {
      return NextResponse.json({ error: 'Boss subscriptions are not enabled.' }, { status: 400 });
    }
    if (!settings.paypalEnabled || !settings.paypalClientId) {
      return NextResponse.json({ error: 'PayPal is not configured.' }, { status: 400 });
    }

    const amount = settings.bossSubscriptionAmount;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Subscription amount not configured.' }, { status: 400 });
    }

    // ── Check existing active subscription ─────────────────────────────────
    const existing = await BossSubscription.findOne({
      status: SubscriptionStatus.ACTIVE,
    });
    if (existing) {
      return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken();
    const config = await getPayPalConfig();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ── Create PayPal Product ──────────────────────────────────────────────
    const productRes = await fetch(`${config.baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `gm-boss-sub-product-${Date.now()}`,
      },
      body: JSON.stringify({
        name: 'GuardMate Boss Monthly Subscription',
        description: 'Monthly subscription for posting jobs on GuardMate',
        type: 'SERVICE',
        category: 'SOFTWARE',
      }),
    });

    if (!productRes.ok) {
      const errText = await productRes.text();
      console.error('PayPal Product Error:', errText);
      return NextResponse.json({ error: 'Failed to create PayPal product.' }, { status: 500 });
    }
    const product = await productRes.json();

    // ── Create PayPal Billing Plan ─────────────────────────────────────────
    const planRes = await fetch(`${config.baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `gm-boss-sub-plan-${Date.now()}`,
      },
      body: JSON.stringify({
        product_id: product.id,
        name: 'GuardMate Monthly Plan',
        description: `AUD ${amount.toFixed(2)}/month boss subscription`,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: { value: amount.toFixed(2), currency_code: 'AUD' },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
          setup_fee: { value: '0', currency_code: 'AUD' },
          setup_fee_failure_action: 'CONTINUE',
        },
      }),
    });

    if (!planRes.ok) {
      const errText = await planRes.text();
      console.error('PayPal Plan Error:', errText);
      return NextResponse.json({ error: 'Failed to create PayPal billing plan.' }, { status: 500 });
    }
    const plan = await planRes.json();

    // ── Create PayPal Subscription ─────────────────────────────────────────
    const subRes = await fetch(`${config.baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `gm-boss-sub-${bossUid}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: plan.id,
        custom_id: bossUid,
        application_context: {
          brand_name: 'GuardMate',
          locale: 'en-AU',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${appUrl}/dashboard/boss/subscription?paypal=success`,
          cancel_url: `${appUrl}/dashboard/boss/subscription?paypal=cancelled`,
        },
      }),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      console.error('PayPal Subscription Error:', errText);
      return NextResponse.json({ error: 'Failed to create PayPal subscription.' }, { status: 500 });
    }
    const paypalSub = await subRes.json();

    const approvalLink = paypalSub.links?.find((l: any) => l.rel === 'approve');
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── Upsert BossSubscription ────────────────────────────────────────────
    let sub = await BossSubscription.findOne({ bossUid });
    const updateData = {
      bossUid,
      status: SubscriptionStatus.LAPSED, // Will become ACTIVE after PayPal confirmation
      amount,
      currency: 'AUD',
      paypalSubscriptionId: paypalSub.id,
      paypalOrderId: null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      failedPaymentAt: null,
      failureReason: null,
    };

    if (sub) {
      await BossSubscription.updateOne({ _id: sub._id }, { $set: updateData });
    } else {
      await BossSubscription.create(updateData);
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: paypalSub.id,
        approvalUrl: approvalLink?.href || '',
        amount,
        currency: 'AUD',
        periodEnd: periodEnd.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('PayPal Subscription Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PayPal subscription' },
      { status: 500 }
    );
  }
}
