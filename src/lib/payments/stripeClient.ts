// ─────────────────────────────────────────────────────────────────────────────
// Stripe Server-Side Client — Fetches credentials from PlatformSettings
// Phase 6: Payments & Escrow System
// IMPORTANT: This file must NEVER be imported in client components.
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';

let cachedStripe: Stripe | null = null;
let cachedKey: string | null = null;

/**
 * Returns a Stripe instance initialized with the secret key from PlatformSettings.
 * Caches the instance until the key changes.
 * @throws Error if Stripe is not configured
 */
export async function getStripeInstance(): Promise<Stripe> {
  await connectDB();
  const settings = await PlatformSettings.findOne().lean();

  if (!settings?.stripeEnabled || !settings?.stripeSecretKey) {
    throw new Error('Stripe is not configured. Please set up Stripe credentials in Admin Settings.');
  }

  const secretKey = settings.stripeSecretKey as string;

  // Re-create instance if key changed
  if (cachedStripe && cachedKey === secretKey) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
  cachedKey = secretKey;
  return cachedStripe;
}

/**
 * Fetches the Stripe webhook secret from PlatformSettings.
 * @throws Error if webhook secret is not configured
 */
export async function getStripeWebhookSecret(): Promise<string> {
  await connectDB();
  const settings = await PlatformSettings.findOne().lean();

  if (!settings?.stripeWebhookSecret) {
    throw new Error('Stripe webhook secret is not configured.');
  }

  return settings.stripeWebhookSecret as string;
}

/**
 * Calculate payment amounts with dual commission model.
 * Boss pays: jobBudget + (jobBudget * bossCommission%)
 * Guard receives: jobBudget - (jobBudget * guardCommission%)
 * Platform revenue: bossCommissionAmount + guardCommissionAmount
 */
export function calculatePaymentBreakdown(
  jobBudget: number,
  bossCommissionRate: number,
  guardCommissionRate: number
): {
  bossCommissionAmount: number;
  guardCommissionAmount: number;
  totalChargedToBoss: number;
  guardPayout: number;
  platformRevenue: number;
} {
  const bossCommissionAmount = Math.round(jobBudget * (bossCommissionRate / 100) * 100) / 100;
  const guardCommissionAmount = Math.round(jobBudget * (guardCommissionRate / 100) * 100) / 100;
  const totalChargedToBoss = Math.round((jobBudget + bossCommissionAmount) * 100) / 100;
  const guardPayout = Math.round((jobBudget - guardCommissionAmount) * 100) / 100;
  const platformRevenue = Math.round((bossCommissionAmount + guardCommissionAmount) * 100) / 100;

  return {
    bossCommissionAmount,
    guardCommissionAmount,
    totalChargedToBoss,
    guardPayout,
    platformRevenue,
  };
}
