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
    currency: string;
    periodEnd: string;
    requiresPayment: boolean;
  }> {
    const res = await apiPost<{
      subscriptionId: string;
      clientSecret: string | null;
      amount: number;
      currency: string;
      periodEnd: string;
      requiresPayment: boolean;
    }>('/api/subscriptions/create-stripe', {});
    return res.data;
  },

  /**
   * Create a PayPal subscription for Boss.
   */
  async createPaypalSubscription(): Promise<{
    subscriptionId: string;
    approvalUrl: string;
    amount: number;
    currency: string;
    periodEnd: string;
  }> {
    const res = await apiPost<{
      subscriptionId: string;
      approvalUrl: string;
      amount: number;
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
   * Get current subscription status for the authenticated Boss.
   */
  async getStatus(): Promise<ISubscriptionStatus> {
    const res = await apiGet<ISubscriptionStatus>('/api/subscriptions/status');
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
