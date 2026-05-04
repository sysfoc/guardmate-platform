// ─────────────────────────────────────────────────────────────────────────────
// Subscription Expiry Checker
// Phase 8: Commission, Subscription & Offers System
//
// Called non-blocking from GET /api/jobs for Boss requests.
// Marks expired ACTIVE subscriptions as LAPSED and sends notification emails.
// ─────────────────────────────────────────────────────────────────────────────

import connectDB from '@/lib/mongodb';
import BossSubscription from '@/models/BossSubscription.model';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { SubscriptionStatus } from '@/types/enums';

/**
 * Check all Boss subscriptions for expiry and upcoming expiry.
 * - Marks ACTIVE subscriptions past their period end as LAPSED
 * - Sends expiry warning emails 3 days before expiry (deduped via expirySentAt)
 *
 * Wrapped entirely in try/catch — never blocks the main request.
 */
export async function checkSubscriptionExpiries(): Promise<void> {
  try {
    await connectDB();

    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.bossSubscriptionEnabled) return;

    const now = new Date();

    // 1. Find ACTIVE subscriptions that have expired
    const expiredSubs = await BossSubscription.find({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { $lt: now },
    });

    for (const sub of expiredSubs) {
      sub.status = SubscriptionStatus.LAPSED;
      await sub.save();

      // Send lapsed email (best effort)
      try {
        const boss = await User.findOne({ uid: sub.bossUid }).select('email firstName').lean();
        if (boss?.email) {
          const gracePeriodDays = settings.bossSubscriptionGracePeriodDays ?? 3;
          const subscribeLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/subscription`;
          const { sendSubscriptionLapsed } = await import('@/lib/email/emailTriggers');
          await sendSubscriptionLapsed(
            boss.email,
            boss.firstName || 'Boss',
            gracePeriodDays,
            subscribeLink
          );
        }
      } catch (emailErr) {
        console.error('Failed to send subscription lapsed email:', emailErr);
      }
    }

    // 2. Find ACTIVE subscriptions expiring within 3 days (send warning, dedup)
    const warningThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoonSubs = await BossSubscription.find({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { $gte: now, $lte: warningThreshold },
      expirySentAt: null,
    });

    for (const sub of expiringSoonSubs) {
      try {
        const boss = await User.findOne({ uid: sub.bossUid }).select('email firstName').lean();
        if (boss?.email) {
          const daysRemaining = Math.max(1, Math.ceil(
            ((sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : now.getTime()) - now.getTime()) / (24 * 60 * 60 * 1000)
          ));
          const renewLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/subscription`;
          const { sendSubscriptionExpiringSoon } = await import('@/lib/email/emailTriggers');
          await sendSubscriptionExpiringSoon(
            boss.email,
            boss.firstName || 'Boss',
            daysRemaining,
            sub.amount || 0,
            sub.currency || 'AUD',
            renewLink
          );
          // Mark as sent to prevent duplicate emails
          sub.expirySentAt = now;
          await sub.save();
        }
      } catch (emailErr) {
        console.error('Failed to send subscription expiring soon email:', emailErr);
      }
    }
  } catch (error) {
    // Never block the main request
    console.error('Subscription expiry check error:', error);
  }
}
