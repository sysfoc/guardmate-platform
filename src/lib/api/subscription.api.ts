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
    clientSecret: string;
    amount: number;
    currency: string;
    periodEnd: string;
  }> {
    const res = await apiPost<{
      clientSecret: string;
      amount: number;
      currency: string;
      periodEnd: string;
    }>('/api/subscriptions/create-stripe', {});
    return res.data;
  },

  /**
   * Create a PayPal order for Boss subscription.
   */
  async createPaypalSubscription(): Promise<{
    orderId: string;
    approvalUrl: string;
    amount: number;
    currency: string;
    periodEnd: string;
  }> {
    const res = await apiPost<{
      orderId: string;
      approvalUrl: string;
      amount: number;
      currency: string;
      periodEnd: string;
    }>('/api/subscriptions/create-paypal', {});
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
};
