// ─────────────────────────────────────────────────────────────────────────────
// Subscription Client API
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import type { ISubscriptionStatus } from '@/types/subscription.types';
import type { ISubscriptionPlan } from '@/types/subscriptionPlan.types';
import type { SubscriptionTier } from '@/types/enums';

export const subscriptionApi = {
  /**
   * Get all enabled subscription plans available for the boss to choose from.
   */
  async getPlans(): Promise<ISubscriptionPlan[]> {
    const res = await apiGet<ISubscriptionPlan[]>('/api/subscriptions/plans');
    return res.data;
  },

  /**
   * Admin: Get all subscription plans (including disabled).
   */
  async adminGetPlans(): Promise<ISubscriptionPlan[]> {
    const res = await apiGet<ISubscriptionPlan[]>('/api/admin/subscriptions/plans');
    return res.data;
  },

  /**
   * Admin: Update a subscription plan tier configuration.
   */
  async adminUpdatePlan(tier: SubscriptionTier, updates: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan> {
    const res = await apiPatch<ISubscriptionPlan>('/api/admin/subscriptions/plans', { tier, ...updates });
    return res.data;
  },

  /**
   * Create a Stripe PaymentIntent for Boss subscription.
   */
  async createStripeSubscription(planTier?: SubscriptionTier): Promise<{
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
    }>('/api/subscriptions/create-stripe', planTier ? { planTier } : {});
    console.log('[api:subscription] 📥 createStripeSubscription response — success:', res.success, '| data keys:', Object.keys(res.data || {}));
    return res.data;
  },

  /**
   * Create a PayPal subscription for Boss.
   */
  async createPaypalSubscription(planTier?: SubscriptionTier): Promise<{
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
    }>('/api/subscriptions/create-paypal', planTier ? { planTier } : {});
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

  /**
   * Cancel a previously scheduled downgrade, keeping the current plan.
   */
  async cancelPendingDowngrade(): Promise<{ message: string }> {
    const res = await apiDelete<{ message: string }>('/api/subscriptions/change-plan');
    return res.data;
  },

  /**
   * Change the active subscription plan (upgrade immediately with proration,
   * or schedule a downgrade for the next billing cycle).
   */
  async changePlan(planTier: SubscriptionTier): Promise<{
    action: 'UPGRADED' | 'DOWNGRADE_SCHEDULED' | 'PLAN_UPDATED';
    newTier: SubscriptionTier;
    amount?: number;
    effectiveAt?: string;
    message: string;
  }> {
    const res = await apiPost<{
      action: 'UPGRADED' | 'DOWNGRADE_SCHEDULED' | 'PLAN_UPDATED';
      newTier: SubscriptionTier;
      amount?: number;
      effectiveAt?: string;
      message: string;
    }>('/api/subscriptions/change-plan', { planTier });
    return res.data;
  },
};
