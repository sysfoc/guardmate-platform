// ─────────────────────────────────────────────────────────────────────────────
// PayPal Server-Side Client — Fetches credentials from PlatformSettings
// Phase 6: Payments & Escrow System
// IMPORTANT: This file must NEVER be imported in client components.
// ─────────────────────────────────────────────────────────────────────────────

import connectDB from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings.model';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  mode: 'sandbox' | 'live';
}

/**
 * Fetches PayPal configuration from PlatformSettings.
 * @throws Error if PayPal is not configured
 */
export async function getPayPalConfig(): Promise<PayPalConfig> {
  await connectDB();
  const settings = await PlatformSettings.findOne().lean();

  if (!settings?.paypalEnabled || !settings?.paypalClientId || !settings?.paypalClientSecret) {
    throw new Error('PayPal is not configured. Please set up PayPal credentials in Admin Settings.');
  }

  const mode = (settings.paypalMode as 'sandbox' | 'live') || 'sandbox';
  const baseUrl = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  return {
    clientId: settings.paypalClientId as string,
    clientSecret: settings.paypalClientSecret as string,
    baseUrl,
    mode,
  };
}

/**
 * Generate PayPal OAuth2 access token.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const config = await getPayPalConfig();
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a PayPal order for escrow.
 */
export async function createPayPalOrder(
  amount: number,
  currency: string,
  description: string,
  referenceId: string
): Promise<{ orderId: string; approvalUrl: string }> {
  const config = await getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: referenceId,
        description,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      }],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/payments?status=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/payments?status=cancelled`,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal order creation failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const approvalLink = data.links?.find((l: { rel: string }) => l.rel === 'approve');

  return {
    orderId: data.id,
    approvalUrl: approvalLink?.href || '',
  };
}

/**
 * Capture a PayPal order after buyer approval.
 */
export async function capturePayPalOrder(
  orderId: string
): Promise<{ captureId: string; status: string }> {
  const config = await getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal capture failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    captureId: capture?.id || '',
    status: data.status,
  };
}

/**
 * Create a PayPal payout to a guard's email address.
 */
export async function createPayPalPayout(
  recipientEmail: string,
  amount: number,
  currency: string,
  senderItemId: string,
  note: string
): Promise<{ payoutBatchId: string }> {
  const config = await getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${config.baseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `GM_${senderItemId}_${Date.now()}`,
        email_subject: 'GuardMate Payment',
        email_message: note,
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: { value: amount.toFixed(2), currency },
        receiver: recipientEmail,
        note,
        sender_item_id: senderItemId,
      }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal payout failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return {
    payoutBatchId: data.batch_header?.payout_batch_id || '',
  };
}
