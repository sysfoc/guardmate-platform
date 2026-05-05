import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getStripeInstance } from '@/lib/payments/stripeClient';
import PlatformSettings from '@/models/PlatformSettings.model';
import BossSubscription from '@/models/BossSubscription.model';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import { SubscriptionStatus } from '@/types/enums';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/create-stripe
// Creates a Stripe Billing Subscription with auto-recurring monthly charges.
// Returns clientSecret for Stripe Elements confirmation on frontend.
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
    if (!settings.stripeEnabled || !settings.stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 400 });
    }

    const amount = settings.bossSubscriptionAmount;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Subscription amount not configured.' }, { status: 400 });
    }


    const currency = 'aud'; // Hardcoded to AUD

    // ── Check existing active subscription ─────────────────────────────────
    const existing = await BossSubscription.findOne({
      status: SubscriptionStatus.ACTIVE,
    });
    if (existing) {
      return NextResponse.json({
        error: 'You already have an active subscription.',
      }, { status: 400 });
    }

    const stripe = await getStripeInstance();

    // ── Get or Create Stripe Customer ──────────────────────────────────────
    let sub = await BossSubscription.findOne({ bossUid });
    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      // Fetch boss user info for customer creation
      const User = (await import('@/models/User.model')).default;
      const boss = await User.findOne({ uid: bossUid }).lean();
      const customer = await stripe.customers.create({
        metadata: { bossUid },
        email: boss?.email || undefined,
        name: boss ? `${boss.firstName} ${boss.lastName}` : undefined,
      });
      customerId = customer.id;
    }

    // ── Get or Create Stripe Product ───────────────────────────────────────
    let product;
    const products = await stripe.products.search({
      query: `metadata['app']:'guardmate' AND metadata['type']:'boss_subscription'`,
    });

    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: 'GuardMate Boss Monthly Subscription',
        description: 'Monthly subscription for posting jobs on GuardMate',
        metadata: { app: 'guardmate', type: 'boss_subscription' },
      });
    }

    // ── Get or Create Stripe Price ─────────────────────────────────────────
    // Always create a new price if amount changes (prices are immutable in Stripe)
    const amountInCents = Math.round(amount * 100);
    let priceId: string;

    // Check if existing sub has a price at the same amount
    if (sub?.stripePriceId) {
      try {
        const existingPrice = await stripe.prices.retrieve(sub.stripePriceId);
        if (
          existingPrice.unit_amount === amountInCents &&
          existingPrice.currency === currency &&
          existingPrice.active
        ) {
          priceId = existingPrice.id;
        } else {
          // Amount changed, create new price
          const newPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: amountInCents,
            currency,
            recurring: { interval: 'month' },
          });
          priceId = newPrice.id;
        }
      } catch {
        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: amountInCents,
          currency,
          recurring: { interval: 'month' },
        });
        priceId = newPrice.id;
      }
    } else {
      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: amountInCents,
        currency,
        recurring: { interval: 'month' },
      });
      priceId = newPrice.id;
    }

    // ── Create Stripe Subscription ─────────────────────────────────────────
    const subscriptionParams: any = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { bossUid, app: 'guardmate' },
    };

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // ── Extract client secret ──────────────────────────────────────────────
    const invoice = stripeSubscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;
    const clientSecret = paymentIntent?.client_secret || null;

    // ── Determine initial status ───────────────────────────────────────────
    const now = new Date();
    const periodEnd = (stripeSubscription as any).current_period_end
      ? new Date((stripeSubscription as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── Upsert BossSubscription document ───────────────────────────────────
    const updateData = {
      bossUid,
      status: clientSecret ? SubscriptionStatus.LAPSED : SubscriptionStatus.ACTIVE, // LAPSED is used as a 'PENDING' state if payment is required. Will become ACTIVE after Stripe webhook confirms payment.
      amount,
      currency: 'AUD',
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
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
        subscriptionId: stripeSubscription.id,
        clientSecret,
        amount,
        currency: 'AUD',
        periodEnd: periodEnd.toISOString(),
        requiresPayment: !!clientSecret,
      },
    });
  } catch (error: any) {
    console.error('Stripe Subscription Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
