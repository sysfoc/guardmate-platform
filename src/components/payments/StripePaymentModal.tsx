'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
} from '@stripe/react-stripe-js';
import { StripePaymentForm } from './StripePaymentForm';
import { Dialog } from '@/components/ui/Dialog';
import { X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiGet } from '@/lib/apiClient';
import toast from 'react-hot-toast';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
}

export function StripePaymentModal({
  isOpen,
  onClose,
  clientSecret,
  amount,
  currency,
  onSuccess,
}: StripePaymentModalProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && !stripePromise) {
      loadStripeConfig();
    }
  }, [isOpen]);

  const loadStripeConfig = async () => {
    try {
      setIsLoading(true);
      const res = await apiGet<{ publishableKey: string }>('/api/payments/stripe/config');
      
      if (res.success && res.data?.publishableKey) {
        const stripe = loadStripe(res.data.publishableKey);
        setStripePromise(stripe);
      } else {
        toast.error('Stripe is not properly configured');
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to load Stripe configuration');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#4f46e5',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Card Payment</h2>
                <p className="text-sm text-slate-500">Enter your card details securely</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-sm text-slate-500">Loading payment form...</p>
              </div>
            ) : stripePromise ? (
              <Elements stripe={stripePromise} options={options}>
                <StripePaymentForm
                  clientSecret={clientSecret}
                  amount={amount}
                  currency={currency}
                  onSuccess={handleSuccess}
                  onCancel={onClose}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load Stripe. Please try again.</p>
                <Button onClick={loadStripeConfig} className="mt-4">
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
