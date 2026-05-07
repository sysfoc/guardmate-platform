// ─────────────────────────────────────────────────────────────────────────────
// Subscription Client API
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost } from '@/lib/apiClient';
import type { ISubscriptionStatus } from '@/types/subscription.types';

export const subscriptionApi = {
  /**
   * Create a Stripe PaymentIntent for Boss subscription.
   */
  async createStripeSubscription(): Promise<{
    subscriptionId: string;
    clientSecret: string | null;
    amount: number;
    originalAmount: number;
    appliedOffer: { offerId: string; offerName: string; originalAmount: number; discountedAmount: number } | null;
    currency: string;
    periodEnd: string;
    requiresPayment: boolean;
  }> {
    console.log('[api:subscription] 📤 POST /api/subscriptions/create-stripe');
    const res = await apiPost<{
      subscriptionId: string;
      clientSecret: string | null;
      amount: number;
      originalAmount: number;
      appliedOffer: { offerId: string; offerName: string; originalAmount: number; discountedAmount: number } | null;
      currency: string;
      periodEnd: string;
      requiresPayment: boolean;
    }>('/api/subscriptions/create-stripe', {});
    console.log('[api:subscription] 📥 createStripeSubscription response — success:', res.success, '| data keys:', Object.keys(res.data || {}));
    return res.data;
  },

  /**
   * Create a PayPal subscription for Boss.
   */
  async createPaypalSubscription(): Promise<{
    subscriptionId: string;
    approvalUrl: string;
    amount: number;
    originalAmount: number;
    appliedOffer: { offerId: string; offerName: string; originalAmount: number; discountedAmount: number } | null;
    currency: string;
    periodEnd: string;
  }> {
    const res = await apiPost<{
      subscriptionId: string;
      approvalUrl: string;
      amount: number;
      originalAmount: number;
      appliedOffer: { offerId: string; offerName: string; originalAmount: number; discountedAmount: number } | null;
      currency: string;
      periodEnd: string;
    }>('/api/subscriptions/create-paypal', {});
    return res.data;
  },

  /**
   * Capture and confirm a PayPal subscription after Boss approval.
   */
  async capturePaypalSubscription(subscriptionId: string): Promise<any> {
    const res = await apiPost<any>('/api/subscriptions/paypal-capture', { subscriptionId });
    return res.data;
  },

  /**
   * Capture and confirm a Stripe subscription after client-side payment succeeds.
   */
  async captureStripeSubscription(subscriptionId: string): Promise<any> {
    console.log('[api:subscription] 📤 POST /api/subscriptions/stripe-capture — subscriptionId:', subscriptionId);
    const res = await apiPost<any>('/api/subscriptions/stripe-capture', { subscriptionId });
    console.log('[api:subscription] 📥 captureStripeSubscription response — success:', res.success, '| message:', res.message);
    return res.data;
  },

  /**
   * Get current subscription status for the authenticated Boss.
   */
  async getStatus(): Promise<ISubscriptionStatus> {
    console.log('[api:subscription] 📤 GET /api/subscriptions/status');
    const res = await apiGet<ISubscriptionStatus>('/api/subscriptions/status');
    console.log('[api:subscription] 📥 getStatus response — status:', res.data?.status, '| isSubscribed:', res.data?.isSubscribed);
    return res.data;
  },

  /**
   * Cancel the current Boss subscription.
   */
  async cancel(): Promise<{ status: string; cancelledAt: string; activeUntil: string }> {
    const res = await apiPost<{ status: string; cancelledAt: string; activeUntil: string }>(
      '/api/subscriptions/cancel', {}
    );
    return res.data;
  },

  /**
   * Get Boss's saved payment method from Stripe.
   */
  async getPaymentMethod(): Promise<{
    hasPaymentMethod: boolean;
    paymentMethodId?: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  }> {
    const res = await apiGet<any>('/api/subscriptions/payment-method');
    return res.data;
  },

  /**
   * Update Boss's default payment method in Stripe.
   */
  async updatePaymentMethod(paymentMethodId: string): Promise<any> {
    const res = await apiPost<any>('/api/subscriptions/payment-method', { paymentMethodId });
    return res.data;
  },
};
