import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import { SubscriptionStatus, SubscriptionTier, UserRole } from '@/types/enums';
import BossSubscription from '@/models/BossSubscription.model';
import SubscriptionPlan from '@/models/SubscriptionPlan.model';
import { seedSubscriptionPlans } from '@/lib/subscriptions/planEnforcement';
import { getStripeInstance } from '@/lib/payments/stripeClient';
import PlatformSettings from '@/models/PlatformSettings.model';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/change-plan
// Upgrades (immediate + prorated) or downgrades (deferred to next cycle) a
// boss subscription plan.
//
// DELETE /api/subscriptions/change-plan
// Cancels a previously scheduled downgrade, keeping the current plan.
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

    const User = (await import('@/models/User.model')).default;
    const user = await User.findOne({ uid: bossUid }).lean();
    if (!user || user.role !== UserRole.BOSS) {
      return NextResponse.json({ error: 'Only Boss accounts can change plans.' }, { status: 403 });
    }

    // ── Validate new plan ──────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const newTier: SubscriptionTier | undefined = Object.values(SubscriptionTier).includes(body.planTier)
      ? body.planTier
      : undefined;

    if (!newTier) {
      return NextResponse.json({ error: 'Invalid or missing planTier.' }, { status: 400 });
    }

    await seedSubscriptionPlans();
    const newPlan = await SubscriptionPlan.findOne({ tier: newTier, isEnabled: true }).lean();
    if (!newPlan) {
      return NextResponse.json({ error: 'Selected plan is not available.' }, { status: 400 });
    }

    // ── Fetch active subscription ──────────────────────────────────────────
    const subscription = await BossSubscription.findOne({
      bossUid,
      status: SubscriptionStatus.ACTIVE,
    });
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
    }

    if (subscription.planTier === newTier) {
      return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 });
    }

    // ── Determine upgrade vs downgrade ────────────────────────────────────
    const currentPlan = await SubscriptionPlan.findOne({ tier: subscription.planTier }).lean();
    const currentPrice = currentPlan?.monthlyPrice ?? 0;
    const isUpgrade = newPlan.monthlyPrice > currentPrice;
    const isDowngrade = newPlan.monthlyPrice < currentPrice;

    const settings = await PlatformSettings.findOne().lean();

    // ── DOWNGRADE: schedule for next billing cycle ─────────────────────────
    if (isDowngrade) {
      await BossSubscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            pendingDowngradeTier: newTier,
            pendingDowngradeAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          action: 'DOWNGRADE_SCHEDULED',
          newTier,
          effectiveAt: subscription.currentPeriodEnd,
          message: `Your plan will change to ${newTier} at your next billing cycle.`,
        },
      });
    }

    // ── UPGRADE / CROSSGRADE: apply immediately ───────────────────────────
    const amountInCents = Math.round(newPlan.monthlyPrice * 100);

    // Stripe path
    if (subscription.stripeSubscriptionId && settings?.stripeEnabled && settings?.stripeSecretKey) {
      const stripe = await getStripeInstance();

      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

      // Create a new price for the new plan amount
      let product;
      const products = await stripe.products.search({
        query: `metadata['app']:'guardmate' AND metadata['type']:'boss_subscription'`,
      });
      product = products.data[0];
      if (!product) {
        product = await stripe.products.create({
          name: 'GuardMate Boss Monthly Subscription',
          metadata: { app: 'guardmate', type: 'boss_subscription' },
        });
      }

      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: amountInCents,
        currency: 'aud',
        recurring: { interval: 'month' },
      });

      const itemId = stripeSub.items.data[0]?.id;
      if (!itemId) {
        return NextResponse.json({ error: 'Could not locate Stripe subscription item.' }, { status: 500 });
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{ id: itemId, price: newPrice.id }],
        proration_behavior: isUpgrade ? 'create_prorations' : 'none',
      });

      await BossSubscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            planTier: newTier,
            amount: newPlan.monthlyPrice,
            stripePriceId: newPrice.id,
            pendingDowngradeTier: null,
            pendingDowngradeAt: null,
          },
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          action: 'UPGRADED',
          newTier,
          amount: newPlan.monthlyPrice,
          message: `Plan upgraded to ${newTier}. Proration applied.`,
        },
      });
    }

    // PayPal / no-Stripe path: update planTier in DB only
    // (PayPal billing amount change requires cancel + resubscribe, handled at next renewal)
    await BossSubscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          planTier: newTier,
          amount: newPlan.monthlyPrice,
          pendingDowngradeTier: null,
          pendingDowngradeAt: null,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        action: 'PLAN_UPDATED',
        newTier,
        amount: newPlan.monthlyPrice,
        message: `Plan updated to ${newTier}. New rate applies at next billing cycle.`,
      },
    });
  } catch (error: any) {
    console.error('[change-plan] Error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Failed to change plan.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyFirebaseToken(authHeader.split('Bearer ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const bossUid = decoded.uid;

    const sub = await BossSubscription.findOne({ bossUid, status: SubscriptionStatus.ACTIVE });
    if (!sub) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
    }
    if (!sub.pendingDowngradeTier) {
      return NextResponse.json({ error: 'No pending downgrade to cancel.' }, { status: 400 });
    }

    await BossSubscription.updateOne(
      { _id: sub._id },
      { $set: { pendingDowngradeTier: null, pendingDowngradeAt: null } }
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Scheduled downgrade cancelled. Your current plan continues.' },
    });
  } catch (error: any) {
    console.error('[change-plan DELETE] Error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel pending downgrade.' },
      { status: 500 }
    );
  }
}
