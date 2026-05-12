import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getStripeInstance } from '@/lib/payments/stripeClient';
import PlatformSettings from '@/models/PlatformSettings.model';
import BossSubscription from '@/models/BossSubscription.model';
import UserOffer from '@/models/UserOffer.model';
import Offer from '@/models/Offer.model';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import { SubscriptionStatus, DiscountType, UserRole } from '@/types/enums';

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

    // Verify the user is a BOSS
    const User = (await import('@/models/User.model')).default;
    const user = await User.findOne({ uid: bossUid }).lean();
    if (!user || user.role !== UserRole.BOSS) {
      return NextResponse.json({ error: 'Only Boss accounts can create subscriptions.' }, { status: 403 });
    }

    console.log('[create-stripe] Authenticated bossUid:', bossUid);

    // ── Platform Settings ──────────────────────────────────────────────────
    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.bossSubscriptionEnabled) {
      return NextResponse.json({ error: 'Boss subscriptions are not enabled.' }, { status: 400 });
    }
    if (!settings.stripeEnabled || !settings.stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 400 });
    }

    let amount = settings.bossSubscriptionAmount;
    console.log('[create-stripe] ⚙️ Platform settings loaded. Raw amount:', amount, '| stripeEnabled:', settings.stripeEnabled, '| stripeSecretKey present:', !!settings.stripeSecretKey);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Subscription amount not configured.' }, { status: 400 });
    }

    // ── Apply acquired subscription discount offer ────────────────────────────
    let appliedOffer: { offerId: string; offerName: string; originalAmount: number; discountedAmount: number } | null = null;
    const now = new Date();
    const bossAcquired = await UserOffer.find({ userUid: bossUid, usedAt: null }).lean();
    console.log('[create-stripe] 🎟️ Offers found for boss:', bossAcquired.length);
    if (bossAcquired.length > 0) {
      const offerIds = bossAcquired.map((r) => r.offerId);
      const offers = await Offer.find({
        _id: { $in: offerIds },
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).lean();
      // Pick the first valid acquired offer (only one should exist in practice)
      const offer = offers[0];
      if (offer) {
        const originalAmount = amount;
        if (offer.discountType === DiscountType.FULL_WAIVER) {
          amount = 0;
        } else if (offer.discountType === DiscountType.PERCENTAGE_OFF && offer.discountValue != null) {
          amount = Math.round(originalAmount * (1 - offer.discountValue / 100) * 100) / 100;
        } else if (offer.discountType === DiscountType.FIXED_RATE && offer.discountValue != null) {
          amount = Math.max(0, offer.discountValue);
        }
        appliedOffer = {
          offerId: String(offer._id),
          offerName: offer.name,
          originalAmount,
          discountedAmount: amount,
        };
        console.log('[create-stripe] 🎟️ Offer applied:', appliedOffer);
      } else {
        console.log('[create-stripe] 🎟️ No valid offer applied. Final amount:', amount);
      }
    }

    const currency = 'aud'; // Hardcoded to AUD

    // ── Check existing active subscription ─────────────────────────────────
    const existing = await BossSubscription.findOne({
      bossUid,
      status: SubscriptionStatus.ACTIVE,
    });
    console.log('[create-stripe] 🔍 Existing active subscription check:', existing ? 'FOUND — blocked' : 'NONE — proceeding');
    if (existing) {
      return NextResponse.json({
        error: 'You already have an active subscription.',
      }, { status: 400 });
    }

    const stripe = await getStripeInstance();
    console.log('[create-stripe] 💳 Stripe instance ready');

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
      console.log('[create-stripe] 👤 New Stripe customer created:', customerId);
    } else {
      console.log('[create-stripe] 👤 Reusing existing Stripe customer:', customerId);
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

    console.log('[create-stripe] 📨 Creating Stripe subscription with params:', JSON.stringify({ customer: subscriptionParams.customer, price: subscriptionParams.items[0].price, amountInCents }));
    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);
    console.log('[create-stripe] ✅ Stripe subscription created:', stripeSubscription.id, '| status:', stripeSubscription.status);

    // ── Extract client secret ──────────────────────────────────────────────
    const invoice = stripeSubscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;
    const clientSecret = paymentIntent?.client_secret || null;
    console.log('[create-stripe] 📄 Invoice ID:', invoice?.id, '| Invoice status:', invoice?.status, '| PaymentIntent ID:', paymentIntent?.id, '| clientSecret present:', !!clientSecret);

    // If amount > 0 and no clientSecret, something is wrong
    if (amount > 0 && !clientSecret) {
      console.error('Stripe subscription created without payment intent', {
        subscriptionId: stripeSubscription.id,
        invoice: invoice?.id,
        paymentIntent: paymentIntent?.id,
      });
      throw new Error('Failed to initialize payment – please try again.');
    }

    // ── Determine initial status ───────────────────────────────────────────
    const periodEnd = (stripeSubscription as any).current_period_end
      ? new Date((stripeSubscription as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Status logic: only ACTIVE if amount === 0, otherwise LAPSED until webhook confirms payment
    const initialStatus = amount === 0 ? SubscriptionStatus.ACTIVE : SubscriptionStatus.LAPSED;
    console.log('[create-stripe] 🏷️ Initial status set to:', initialStatus, '| amount:', amount, '| periodEnd:', periodEnd.toISOString());

    // ── Upsert BossSubscription document ───────────────────────────────────
    const updateData = {
      bossUid,
      status: initialStatus,
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
      appliedOfferId: appliedOffer?.offerId ?? null,
    };

    if (sub) {
      await BossSubscription.updateOne({ _id: sub._id }, { $set: updateData });
      console.log('[create-stripe] 🔄 Updated existing BossSubscription document:', sub._id);
    } else {
      const createdSub = await BossSubscription.create(updateData);
      console.log('[create-stripe] 🆕 Created new BossSubscription document:', createdSub._id);
    }
    console.log('[create-stripe] 📤 Returning response — subscriptionId:', stripeSubscription.id, '| clientSecret present:', !!clientSecret, '| requiresPayment:', !!clientSecret);

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: stripeSubscription.id,
        clientSecret,
        amount,
        originalAmount: appliedOffer?.originalAmount ?? amount,
        appliedOffer,
        currency: 'AUD',
        periodEnd: periodEnd.toISOString(),
        requiresPayment: !!clientSecret,
      },
    });
  } catch (error: any) {
    console.error('[create-stripe] ❌ FATAL ERROR:', error?.message || error, '| stack:', error?.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
