'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CreditCard, ArrowLeft, CheckCircle2, Clock, AlertTriangle,
  Shield, Calendar, DollarSign, X
} from 'lucide-react';
import { subscriptionApi } from '@/lib/api/subscription.api';
import { usePlatformContext } from '@/context/PlatformContext';
import type { ISubscriptionStatus } from '@/types/subscription.types';
import toast from 'react-hot-toast';

export default function BossSubscriptionPage() {
  const { platformSettings } = usePlatformContext();
  const [subStatus, setSubStatus] = useState<ISubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const status = await subscriptionApi.getStatus();
      setSubStatus(status);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      if (paymentMethod === 'stripe') {
        const result = await subscriptionApi.createStripeSubscription();
        // In a real implementation, this would open the Stripe payment element
        toast.success(`Subscription PaymentIntent created. Period ends: ${new Date(result.periodEnd).toLocaleDateString()}`);
      } else {
        const result = await subscriptionApi.createPaypalSubscription();
        // Redirect to PayPal approval URL
        if (result.approvalUrl) {
          window.location.href = result.approvalUrl;
          return;
        }
        toast.success('PayPal subscription order created.');
      }
      await loadStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCancelling(true);
      const result = await subscriptionApi.cancel();
      toast.success(`Subscription cancelled. Active until ${new Date(result.activeUntil).toLocaleDateString()}.`);
      setShowCancelConfirm(false);
      await loadStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!platformSettings?.bossSubscriptionEnabled) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <Shield className="h-12 w-12 text-[var(--color-primary)] mx-auto mb-4 opacity-40" />
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Subscriptions Not Required</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            The platform does not currently require a subscription to post jobs. You have full access!
          </p>
          <Link href="/dashboard/boss">
            <Button variant="ghost" className="mt-6" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSubscribed = subStatus?.isSubscribed ?? false;
  const statusLabel = subStatus?.status === 'ACTIVE' ? 'Active' : subStatus?.status === 'TRIAL' ? 'Free Trial' : subStatus?.status === 'CANCELLED' ? 'Cancelled' : subStatus?.status === 'LAPSED' ? (subStatus.isInGracePeriod ? 'Grace Period' : 'Lapsed') : 'Not Subscribed';

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/boss" className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] flex items-center gap-1 mb-2 transition-colors font-medium">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-[var(--color-primary)]" />
              Subscription
            </h1>
          </div>
        </div>

        {/* Status Card */}
        <Card className={`p-6 border-2 ${
          isSubscribed
            ? subStatus?.status === 'ACTIVE' ? 'border-emerald-300' : subStatus?.status === 'TRIAL' ? 'border-blue-300' : 'border-amber-300'
            : 'border-red-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                isSubscribed
                  ? subStatus?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  : 'bg-red-100 text-red-600'
              }`}>
                {isSubscribed ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">Current Plan</p>
                <h2 className="text-xl font-black text-[var(--color-text-primary)]">{statusLabel}</h2>
                {subStatus?.daysRemaining !== null && subStatus?.daysRemaining !== undefined && subStatus.daysRemaining > 0 && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {subStatus.daysRemaining} day{subStatus.daysRemaining !== 1 ? 's' : ''} remaining
                    {subStatus.expiresAt && ` · Expires ${new Date(subStatus.expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={isSubscribed ? (subStatus?.status === 'ACTIVE' ? 'success' : 'info') : 'danger'} className="text-xs px-3 py-1">
                {statusLabel.toUpperCase()}
              </Badge>
              {subStatus?.amount !== undefined && subStatus.amount > 0 && (
                <p className="text-lg font-black text-[var(--color-text-primary)]">
                  ${subStatus.amount.toFixed(2)} <span className="text-xs font-medium text-[var(--color-text-tertiary)]">/{subStatus.currency}/mo</span>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Not Subscribed — Subscribe Section */}
        {!isSubscribed && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Subscribe to Post Jobs</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              A monthly subscription is required to post and manage jobs on GuardMate. Choose your preferred payment method below.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border-primary)] hover:border-[var(--color-primary)]/50'
                }`}
              >
                <CreditCard className="h-6 w-6 mb-2 text-[var(--color-primary)]" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Card Payment</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Visa, Mastercard, Amex</p>
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'paypal'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border-primary)] hover:border-[var(--color-primary)]/50'
                }`}
              >
                <DollarSign className="h-6 w-6 mb-2 text-blue-600" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">PayPal</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">PayPal account</p>
              </button>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full h-12 text-base font-bold shadow-lg shadow-[var(--color-primary)]/20"
            >
              {subscribing ? 'Processing...' : `Subscribe for $${(subStatus?.amount ?? 0).toFixed(2)}/month`}
            </Button>
          </Card>
        )}

        {/* Active Subscription — Management */}
        {isSubscribed && subStatus?.status === 'ACTIVE' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Manage Subscription</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-xl">
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Status</p>
                <p className="text-sm font-bold text-emerald-600">Active</p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-xl">
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Next Renewal</p>
                <p className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {subStatus.expiresAt ? new Date(subStatus.expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-xl">
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Monthly Amount</p>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">${subStatus.amount.toFixed(2)} {subStatus.currency}</p>
              </div>
            </div>

            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-[var(--color-danger)] hover:underline font-medium"
              >
                Cancel Subscription
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">Are you sure you want to cancel?</p>
                    <p className="text-xs text-red-700 mt-1">
                      Your subscription will remain active until the current period ends. After that, you won&apos;t be able to post new jobs until you resubscribe.
                    </p>
                    <div className="flex gap-3 mt-3">
                      <Button size="sm" variant="danger" onClick={handleCancel} disabled={cancelling}>
                        {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>
                        Keep Subscription
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Cancelled / Lapsed — Resubscribe */}
        {(subStatus?.status === 'CANCELLED' || (subStatus?.status === 'LAPSED' && !subStatus.isInGracePeriod)) && (
          <Card className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
              {subStatus.status === 'CANCELLED' ? 'Subscription Cancelled' : 'Subscription Expired'}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-6">
              Resubscribe now to continue posting jobs and managing your security workforce on GuardMate.
            </p>
            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="px-8 h-11 font-bold shadow-lg shadow-[var(--color-primary)]/20"
            >
              {subscribing ? 'Processing...' : `Resubscribe for $${(subStatus?.amount ?? 0).toFixed(2)}/month`}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
