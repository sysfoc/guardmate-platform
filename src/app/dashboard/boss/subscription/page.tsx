'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CreditCard, ArrowLeft, CheckCircle2, Clock, AlertTriangle,
  Shield, Calendar, DollarSign, Edit, Tag
} from 'lucide-react';
import { subscriptionApi } from '@/lib/api/subscription.api';
import { offerApi } from '@/lib/api/offer.api';
import { usePlatformContext } from '@/context/PlatformContext';
import type { ISubscriptionStatus } from '@/types/subscription.types';
import type { IOffer } from '@/types/offer.types';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Initialize Stripe outside component render to avoid recreating it
let stripePromise: Promise<any> | null = null;
const getStripe = (key?: string) => {
  if (!stripePromise && key) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

function StripeCardForm({
  clientSecret,
  onSuccess,
  onCancel,
  buttonText = "Pay Now"
}: {
  clientSecret?: string;
  onSuccess: (paymentMethodId?: string) => void;
  onCancel: () => void;
  buttonText?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    console.log('[frontend:StripeCardForm] 💳 Card form submitted. clientSecret present:', !!clientSecret);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      if (clientSecret) {
        // Initial subscription setup with PaymentIntent
        console.log('[frontend:StripeCardForm] 📤 Calling stripe.confirmCardPayment with clientSecret...');
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          }
        });
        console.log('[frontend:StripeCardForm] 📥 confirmCardPayment result — error:', !!error, '| paymentIntent status:', paymentIntent?.status, '| paymentIntent id:', paymentIntent?.id);

        if (error) {
          console.error('[frontend:StripeCardForm] ❌ Payment confirmation error:', error.message);
          throw new Error(error.message || 'Payment failed');
        }
        console.log('[frontend:StripeCardForm] ✅ Payment confirmed successfully. Calling onSuccess()');
        onSuccess();
      } else {
        // Just updating payment method
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });

        if (error) {
          throw new Error(error.message || 'Failed to create payment method');
        }
        
        // Send paymentMethod.id to backend
        const res = await subscriptionApi.updatePaymentMethod(paymentMethod.id);
        if (res.success) {
          onSuccess(paymentMethod.id);
        } else {
          throw new Error(res.message);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="p-4 border rounded-md bg-white">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#32325d',
              '::placeholder': { color: '#aab7c4' },
            },
            invalid: { color: '#fa755a', iconColor: '#fa755a' },
          }
        }} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="w-1/3" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="w-2/3" disabled={!stripe || processing}>
          {processing ? 'Processing...' : buttonText}
        </Button>
      </div>
    </form>
  );
}

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const paypalStatus = searchParams.get('paypal');
  const paypalSubscriptionId = searchParams.get('subscription_id');
  const { platformSettings } = usePlatformContext();
  const [subStatus, setSubStatus] = useState<ISubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showStripeForm, setShowStripeForm] = useState(false);
  
  const [savedCard, setSavedCard] = useState<any>(null);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null);

  // Acquired offer state
  const [acquiredOffer, setAcquiredOffer] = useState<IOffer | null>(null);
  const [offerDiscountLabel, setOfferDiscountLabel] = useState<string | null>(null);

  // Payment method availability derived from platform settings
  const stripeAvailable = platformSettings?.stripeEnabled ?? false;
  const paypalAvailable = platformSettings?.paypalEnabled ?? false;
  const anyPaymentAvailable = stripeAvailable || paypalAvailable;

  // Auto-select the first available payment method when settings load
  useEffect(() => {
    if (stripeAvailable && !paypalAvailable) setPaymentMethod('stripe');
    else if (!stripeAvailable && paypalAvailable) setPaymentMethod('paypal');
    // If both are available, keep whatever is already selected (default 'stripe')
  }, [stripeAvailable, paypalAvailable]);

  useEffect(() => {
    // Fetch acquired subscription offer (only active AND unconsumed)
    offerApi.getMyOffers()
      .then((records) => {
        const active = records.find((r) => r.isStillActive && !r.isConsumed);
        if (active) {
          setAcquiredOffer(active.offer);
          const o = active.offer;
          if (o.discountType === 'FULL_WAIVER') {
            setOfferDiscountLabel('Full Waiver');
          } else if (o.discountType === 'PERCENTAGE_OFF' && o.discountValue != null) {
            setOfferDiscountLabel(`${o.discountValue}% Off`);
          } else if (o.discountType === 'FIXED_RATE' && o.discountValue != null) {
            setOfferDiscountLabel(`Fixed ${o.discountValue}%`);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Handle PayPal redirect return
    if (paypalStatus === 'success') {
      toast.success('PayPal approval successful. Activating subscription...', { id: 'paypal-auth' });
      // Call capture API to verify and activate the subscription immediately.
      if (paypalSubscriptionId) {
        subscriptionApi.capturePaypalSubscription(paypalSubscriptionId).then(() => {
           loadStatus();
        }).catch((e) => {
           console.error('PayPal capture error', e);
           loadStatus();
        });
      } else {
        // Fallback: subscription_id not in URL, rely on webhook to activate
        console.warn('PayPal subscription_id not found in return URL, relying on webhook.');
        loadStatus();
      }
    } else if (paypalStatus === 'cancelled') {
      toast.error('PayPal checkout cancelled.');
    } else {
      loadStatus();
    }
  }, [paypalStatus]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const status = await subscriptionApi.getStatus();
      setSubStatus(status);
      
      // Load saved payment method if active
      if (status.isSubscribed && status.status !== 'CANCELLED') {
        try {
          const pmData = await subscriptionApi.getPaymentMethod();
          if (pmData?.hasPaymentMethod) {
            setSavedCard(pmData);
          }
        } catch {
          // Payment method fetch is non-critical, don't block
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    console.log('[frontend:handleSubscribe] 🚀 Subscribe button clicked. paymentMethod:', paymentMethod);
    try {
      setSubscribing(true);
      if (paymentMethod === 'stripe') {
        console.log('[frontend:handleSubscribe] 📤 Calling createStripeSubscription API...');
        const result = await subscriptionApi.createStripeSubscription();
        console.log('[frontend:handleSubscribe] 📥 API response — subscriptionId:', result.subscriptionId, '| clientSecret present:', !!result.clientSecret, '| amount:', result.amount, '| status requiresPayment:', result.requiresPayment);
        if (!result.clientSecret) {
          console.error('[frontend:handleSubscribe] ❌ No clientSecret in response. Throwing error.');
          throw new Error('Payment initialization failed – missing client secret. Please contact support.');
        }
        console.log('[frontend:handleSubscribe] ✅ clientSecret received. Showing Stripe card form.');
        setPendingSubscriptionId(result.subscriptionId);
        setClientSecret(result.clientSecret);
        setShowStripeForm(true);
      } else {
        const result = await subscriptionApi.createPaypalSubscription();
        if (result.approvalUrl) {
          window.location.href = result.approvalUrl;
          return;
        }
        toast.success('PayPal subscription created.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleStripeSuccess = async () => {
    console.log('[frontend:handleStripeSuccess] 🎉 Stripe card form reported success. pendingSubscriptionId:', pendingSubscriptionId);
    setShowStripeForm(false);
    setClientSecret(null);
    setIsUpdatingCard(false);

    // If we have a pending subscription ID, explicitly capture it with Stripe
    // so the DB is updated immediately instead of waiting for the webhook.
    if (pendingSubscriptionId) {
      console.log('[frontend:handleStripeSuccess] 📤 Calling captureStripeSubscription for subscriptionId:', pendingSubscriptionId);
      try {
        const captureResult = await subscriptionApi.captureStripeSubscription(pendingSubscriptionId);
        console.log('[frontend:handleStripeSuccess] ✅ Capture response:', captureResult);
        toast.success('Payment successful! Subscription active.');
      } catch (e: any) {
        console.warn('[frontend:handleStripeSuccess] ⚠️ Capture failed, falling back to webhook delay:', e?.message || e);
        toast.success('Payment successful! Activating subscription...');
      }
      setPendingSubscriptionId(null);
    } else {
      console.log('[frontend:handleStripeSuccess] ℹ️ No pending subscription — just updating payment method.');
      toast.success('Payment method updated successfully.');
    }

    console.log('[frontend:handleStripeSuccess] 🔄 Reloading subscription status...');
    await loadStatus();
    console.log('[frontend:handleStripeSuccess] ✅ Status reload complete.');
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
  const statusLabel = subStatus?.status === 'ACTIVE' ? 'Active' : subStatus?.status === 'CANCELLED' ? 'Cancelled' : subStatus?.status === 'LAPSED' ? 'Lapsed' : 'Not Subscribed';

  // Compute discounted amount for display when not subscribed
  // subStatus.amount is always fresh (fetched directly from PlatformSettings DB),
  // whereas platformSettings context may be stale/cached.
  const baseSubscriptionAmount = subStatus?.amount ?? platformSettings?.bossSubscriptionAmount ?? 0;
  let displayedAmount = baseSubscriptionAmount;
  if (!isSubscribed && acquiredOffer && acquiredOffer.discountValue != null) {
    if (acquiredOffer.discountType === 'FULL_WAIVER') {
      displayedAmount = 0;
    } else if (acquiredOffer.discountType === 'PERCENTAGE_OFF') {
      displayedAmount = Math.round(baseSubscriptionAmount * (1 - acquiredOffer.discountValue / 100) * 100) / 100;
    } else if (acquiredOffer.discountType === 'FIXED_RATE') {
      displayedAmount = Math.max(0, acquiredOffer.discountValue);
    }
  }

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
            ? subStatus?.status === 'ACTIVE' ? 'border-emerald-300' : 'border-amber-300'
            : 'border-red-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                isSubscribed
                  ? subStatus?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
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
                <div className="text-right">
                  <p className="text-lg font-black text-[var(--color-text-primary)]">
                    ${subStatus.amount.toFixed(2)} <span className="text-xs font-medium text-[var(--color-text-tertiary)]">/{subStatus.currency}/mo</span>
                  </p>
                  {acquiredOffer && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      Discounted with {acquiredOffer.name} ({offerDiscountLabel})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Not Subscribed — Subscribe Section */}
        {!isSubscribed && (
          <Card className="p-6 relative overflow-hidden">
            {subscribing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-bg-primary)]/80 backdrop-blur-sm rounded-xl">
                <div className="h-8 w-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Processing Payment...</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Please wait while we set up your subscription</p>
              </div>
            )}
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Subscribe to Post Jobs</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              A monthly subscription is required to post and manage jobs on GuardMate. Choose your preferred payment method below.
            </p>

            {!showStripeForm ? (
              <>
                {anyPaymentAvailable ? (
                  <>
                    <div className={`grid gap-4 mb-6 ${stripeAvailable && paypalAvailable ? 'grid-cols-2' : 'grid-cols-1 max-w-xs mx-auto'}`}>
                      {stripeAvailable && (
                        <button
                          onClick={() => setPaymentMethod('stripe')}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === 'stripe'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                              : 'border-[var(--color-border-primary)] hover:border-[var(--color-primary)]/50'
                          }`}
                        >
                          <CreditCard className="h-6 w-6 mb-2 text-[var(--color-primary)] mx-auto" />
                          <p className="text-sm font-bold text-[var(--color-text-primary)] text-center">Card Payment</p>
                        </button>
                      )}
                      {paypalAvailable && (
                        <button
                          onClick={() => setPaymentMethod('paypal')}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === 'paypal'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                              : 'border-[var(--color-border-primary)] hover:border-[var(--color-primary)]/50'
                          }`}
                        >
                          <DollarSign className="h-6 w-6 mb-2 text-blue-600 mx-auto" />
                          <p className="text-sm font-bold text-[var(--color-text-primary)] text-center">PayPal</p>
                        </button>
                      )}
                    </div>

                    {acquiredOffer && !isSubscribed && (
                      <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />
                          Offer Applied: {acquiredOffer.name} ({offerDiscountLabel})
                        </p>
                        {displayedAmount !== baseSubscriptionAmount && (
                          <p className="text-[10px] text-emerald-700 mt-1">
                            Original price: ${baseSubscriptionAmount.toFixed(2)}/mo →{' '}
                            <span className="font-bold">${displayedAmount.toFixed(2)}/mo</span>
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleSubscribe}
                      disabled={subscribing}
                      className="w-full h-12 text-base font-bold shadow-lg shadow-[var(--color-primary)]/20"
                    >
                      {subscribing ? 'Processing...' : `Subscribe for $${displayedAmount.toFixed(2)}/month`}
                    </Button>
                  </>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-amber-800">Payment Methods Not Configured</p>
                    <p className="text-xs text-amber-700 mt-1">
                      No payment providers are currently available. Please contact support.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-3">Enter Card Details</h4>
                {platformSettings?.stripePublishableKey && (
                  <Elements stripe={getStripe(platformSettings.stripePublishableKey)} options={{ clientSecret: clientSecret! }}>
                    <StripeCardForm 
                      clientSecret={clientSecret!} 
                      onSuccess={handleStripeSuccess} 
                      onCancel={() => { setShowStripeForm(false); setClientSecret(null); setPendingSubscriptionId(null); }}
                      buttonText={`Pay $${displayedAmount.toFixed(2)}`}
                    />
                  </Elements>
                )}
              </div>
            )}
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

            {savedCard && !isUpdatingCard && (
              <div className="mb-6 p-4 border rounded-xl flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 bg-slate-50">
                <div className="flex items-center gap-3 w-full min-w-0">
                  <CreditCard className="h-5 w-5 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{savedCard.brand} ending in {savedCard.last4}</p>
                    <p className="text-xs text-slate-500 truncate">Expires {savedCard.expMonth}/{savedCard.expYear}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsUpdatingCard(true)} className="w-full sm:w-auto shrink-0">
                  <Edit className="w-4 h-4 mr-1" /> Update
                </Button>
              </div>
            )}

            {isUpdatingCard && platformSettings?.stripePublishableKey && (
              <div className="mb-6 p-4 border rounded-xl bg-slate-50">
                <h4 className="font-medium text-sm mb-3">Update Payment Method</h4>
                <Elements stripe={getStripe(platformSettings.stripePublishableKey)}>
                  <StripeCardForm 
                    onSuccess={handleStripeSuccess} 
                    onCancel={() => setIsUpdatingCard(false)}
                    buttonText="Save Card"
                  />
                </Elements>
              </div>
            )}

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
        {(subStatus?.status === 'CANCELLED' || subStatus?.status === 'LAPSED') && (
          <Card className="p-6 text-center relative overflow-hidden">
            {subscribing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-bg-primary)]/80 backdrop-blur-sm rounded-xl">
                <div className="h-8 w-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Processing Payment...</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Please wait while we set up your subscription</p>
              </div>
            )}
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
              {subStatus.status === 'CANCELLED' ? 'Subscription Cancelled' : 'Subscription Inactive'}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-6">
              Resubscribe now to continue posting jobs and managing your security workforce on GuardMate.
            </p>
            {!showStripeForm ? (
              <>
                {anyPaymentAvailable ? (
                  <>
                    {stripeAvailable && paypalAvailable && (
                      <div className="flex justify-center gap-4 mb-4">
                        <button
                          onClick={() => setPaymentMethod('stripe')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-bold ${paymentMethod === 'stripe' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500'}`}
                        >Card</button>
                        <button
                          onClick={() => setPaymentMethod('paypal')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-bold ${paymentMethod === 'paypal' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500'}`}
                        >PayPal</button>
                      </div>
                    )}
                    <Button
                      onClick={handleSubscribe}
                      disabled={subscribing}
                      className="px-8 h-11 font-bold shadow-lg shadow-[var(--color-primary)]/20"
                    >
                      {subscribing ? 'Processing...' : `Resubscribe for $${(subStatus?.amount ?? 0).toFixed(2)}/month`}
                    </Button>
                  </>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-amber-800">Payment Methods Not Configured</p>
                    <p className="text-xs text-amber-700 mt-1">
                      No payment providers are currently available. Please contact support.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 text-left">
                <h4 className="font-medium text-sm mb-3">Enter Card Details</h4>
                {platformSettings?.stripePublishableKey && (
                  <Elements stripe={getStripe(platformSettings.stripePublishableKey)} options={{ clientSecret: clientSecret! }}>
                    <StripeCardForm 
                      clientSecret={clientSecret!} 
                      onSuccess={handleStripeSuccess} 
                      onCancel={() => { setShowStripeForm(false); setClientSecret(null); setPendingSubscriptionId(null); }}
                      buttonText={`Pay $${displayedAmount.toFixed(2)}`}
                    />
                  </Elements>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BossSubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  )
}
