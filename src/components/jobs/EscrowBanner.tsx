'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, ShieldCheck, CreditCard, Sparkles, Loader2 } from 'lucide-react';
import { JobPaymentStatus } from '@/types/enums';
import { createStripeIntent, createPaypalOrder } from '@/lib/api/payment.api';
import { StripePaymentModal } from '@/components/payments/StripePaymentModal';
import toast from 'react-hot-toast';

interface EscrowBannerProps {
  jobId: string;
  paymentStatus: JobPaymentStatus;
  budgetAmount: number;
  currency: string;
  onPaymentComplete: () => void;
  bossCommissionRate?: number;
}

interface PaymentBreakdown {
  jobBudget: number;
  bossCommissionAmount: number;
  totalChargedToBoss: number;
}

export function EscrowBanner({ 
  jobId, 
  paymentStatus, 
  budgetAmount, 
  currency, 
  onPaymentComplete,
  bossCommissionRate = 10 
}: EscrowBannerProps) {
  const [loading, setLoading] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
  
  // Calculate expected amounts (will be updated from API response)
  const displayBudget = paymentBreakdown?.jobBudget ?? budgetAmount;
  const displayCommission = paymentBreakdown?.bossCommissionAmount ?? Math.round(budgetAmount * (bossCommissionRate / 100) * 100) / 100;
  const displayTotal = paymentBreakdown?.totalChargedToBoss ?? Math.round((budgetAmount + (budgetAmount * bossCommissionRate / 100)) * 100) / 100;

  const handleStripePayment = async () => {
    try {
      setLoading(true);
      const res = await createStripeIntent(jobId);
      
      if (res.success && res.data?.clientSecret) {
        setClientSecret(res.data.clientSecret);
        // Store the breakdown from API (uses actual bid amount)
        if (res.data.breakdown) {
          setPaymentBreakdown(res.data.breakdown);
        }
        setShowStripeModal(true);
      } else {
        toast.error(res.message || 'Failed to initialize Stripe payment');
      }
    } catch (err: any) {
      toast.error('Failed to initiate Stripe payment');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = () => {
    toast.success('Payment successful! Funds are now in escrow.');
    onPaymentComplete();
  };

  const handlePayPalPayment = async () => {
    try {
      setLoading(true);
      const res = await createPaypalOrder(jobId);
      if (res.success && res.data.approvalUrl) {
         // Redirect to PayPal
         window.location.href = res.data.approvalUrl;
      } else {
         toast.error(res.message);
         setLoading(false);
      }
    } catch (err: any) {
      toast.error('Failed to initiate PayPal payment');
      setLoading(false);
    }
  };

  if (paymentStatus === JobPaymentStatus.HELD) {
    return (
      <Card className="bg-emerald-50 border-emerald-200 p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 border-2 border-emerald-500 rounded-full text-emerald-600 bg-emerald-100">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800">Funds in Secure Escrow</h4>
            <p className="text-sm text-emerald-700">
              Your payment is safely held by GuardMate. It will be released to the guards after you approve their completed shifts.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-emerald-600 font-bold">
           <ShieldCheck className="w-5 h-5" /> Active
        </div>
      </Card>
    );
  }

  if (paymentStatus === JobPaymentStatus.RELEASED) {
    return null; // Don't show anything once released
  }

  // UNPAID status
  return (
    <>
      <Card className="bg-indigo-50 border-indigo-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 border-[3px] border-indigo-500 rounded-full text-indigo-600 bg-white shadow-sm mt-1">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              Fund Escrow to Proceed <Sparkles className="w-4 h-4 text-indigo-500" />
            </h4>
            <p className="text-sm text-indigo-700 mt-1 mb-4 max-w-2xl">
              This job has been fully hired! Before the guards can begin their shifts, you must fund the escrow. 
              GuardMate holds this money securely and only releases it after you explicitly approve the completed shifts.
            </p>

            <div className="bg-white rounded-lg border border-indigo-100 p-4 mb-4 max-w-md">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Job Budget</span>
                  <span className="font-medium">{currency} {displayBudget.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Platform Fee ({bossCommissionRate}%)</span>
                  <span className="font-medium">{currency} {displayCommission.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase font-bold text-xs tracking-wider">Total Due</span>
                    <span className="text-xl font-black text-slate-800 tracking-tight">
                      {currency} {displayTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Button 
                onClick={handleStripePayment} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading && !showStripeModal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Pay with Card
              </Button>
              <Button 
                onClick={handlePayPalPayment} 
                variant="outline"
                className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Pay with PayPal
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium font-sans mt-4">
              <Lock className="w-3 h-3" /> Secure PCI-Compliant Payment Processing
            </div>
          </div>
        </div>
      </Card>

      <StripePaymentModal
        isOpen={showStripeModal}
        onClose={() => {
          setShowStripeModal(false);
          setLoading(false);
        }}
        clientSecret={clientSecret}
        amount={displayTotal}
        currency={currency}
        onSuccess={handleStripeSuccess}
      />
    </>
  );
}
