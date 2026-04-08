'use client';

import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { Loader2, Lock } from 'lucide-react';
import { confirmStripePayment } from '@/lib/api/payment.api';
import toast from 'react-hot-toast';

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function extractPaymentIntentId(clientSecret: string): string {
  // clientSecret format: pi_xxx_secret_yyy
  return clientSecret.split('_secret_')[0];
}

export function StripePaymentForm({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onCancel,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/boss/payments?status=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // CRITICAL: Confirm with backend to update database
        const paymentIntentId = extractPaymentIntentId(clientSecret);
        const confirmRes = await confirmStripePayment(paymentIntentId);
        
        if (confirmRes.success) {
          toast.success('Payment successful! Funds are now in escrow.');
          onSuccess();
        } else {
          setErrorMessage(confirmRes.message || 'Payment processed but confirmation failed. Please refresh.');
          // Still call success to refresh page
          onSuccess();
        }
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        toast('Payment is processing...', { icon: '⏳' });
        // Poll for status or wait for webhook
        setTimeout(() => onSuccess(), 2000);
      } else {
        setErrorMessage('Unexpected payment status. Please check your payment history.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      toast.error('Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Display */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-sm text-slate-500 mb-1">Amount to Pay</p>
        <p className="text-3xl font-bold text-slate-800">
          {currency} {amount.toFixed(2)}
        </p>
      </div>

      {/* Stripe Payment Element */}
      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <PaymentElement 
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: '',
              },
            },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Lock className="w-3 h-3" />
        <span>Your payment is secured with Stripe AES-256 encryption</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${currency} ${amount.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}
