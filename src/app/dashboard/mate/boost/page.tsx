'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StripePaymentModal } from '@/components/payments/StripePaymentModal';
import { useUser } from '@/context/UserContext';
import { usePlatformContext } from '@/context/PlatformContext';
import { apiGet, apiPost } from '@/lib/apiClient';
import {
  Zap, CheckCircle2, Clock, Shield, TrendingUp, Loader2, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BoostSettingsResponse {
  mateBoostEnabled: boolean;
  mateBoostFee: number;
  mateBoostDurationDays: number;
  currency: string;
}

interface BoostIntentResponse {
  clientSecret: string;
  fee: number;
  durationDays: number;
  currency: string;
}

interface MeResponse {
  isFeatured: boolean;
  featuredUntil: string | null;
}

export default function MateBoostPage() {
  const { user } = useUser();
  const { platformSettings } = usePlatformContext();

  const [loading, setLoading] = useState(true);
  const [boostStatus, setBoostStatus] = useState<{
    isFeatured: boolean;
    featuredUntil: string | null;
  } | null>(null);

  const [creating, setCreating] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [boostFee, setBoostFee] = useState<number>(9.99);
  const [boostDays, setBoostDays] = useState<number>(7);

  const currency = platformSettings?.platformCurrency || 'AUD';
  const currencySymbol = '$';
  const mateBoostEnabled = platformSettings?.mateBoostEnabled ?? false;

  const loadBoostStatus = async () => {
    try {
      setLoading(true);
      const res = await apiGet<MeResponse>('/api/auth/me');
      if (res.success && res.data) {
        setBoostStatus({
          isFeatured: res.data.isFeatured ?? false,
          featuredUntil: res.data.featuredUntil ?? null,
        });
      }
    } catch {
      toast.error('Failed to load boost status.');
    } finally {
      setLoading(false);
    }
  };

  const loadBoostSettings = async () => {
    try {
      const res = await apiGet<BoostSettingsResponse>('/api/boost/mate/settings');
      if (res.success && res.data) {
        setBoostFee(res.data.mateBoostFee ?? 9.99);
        setBoostDays(res.data.mateBoostDurationDays ?? 7);
      }
    } catch {
      // silently use defaults
    }
  };

  useEffect(() => {
    loadBoostStatus();
    loadBoostSettings();
  }, []);

  const handleBoost = async () => {
    try {
      setCreating(true);
      const res = await apiPost<BoostIntentResponse>('/api/boost/mate/create-intent', {});
      if (!res.success) {
        toast.error(res.message || 'Failed to create boost payment.');
        return;
      }
      setClientSecret(res.data.clientSecret);
      setBoostFee(res.data.fee ?? boostFee);
      setBoostDays(res.data.durationDays ?? boostDays);
      setPaymentModalOpen(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaymentModalOpen(false);
    setClientSecret(null);
    toast.success('Your profile is now boosted! You\'ll appear at the top of bid lists.');
    await loadBoostStatus();
  };

  const isActiveBoost =
    boostStatus?.isFeatured &&
    boostStatus.featuredUntil &&
    new Date(boostStatus.featuredUntil) > new Date();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const daysRemaining = boostStatus?.featuredUntil
    ? Math.max(0, Math.ceil((new Date(boostStatus.featuredUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Boost My Profile
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Appear at the top of bid lists so employers notice you first.
        </p>
      </div>

      {/* Current Status Card */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
          Current Boost Status
        </h2>
        {isActiveBoost ? (
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                Profile Boosted
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                Your profile is featured until{' '}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {formatDate(boostStatus!.featuredUntil!)}
                </span>
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-[var(--color-bg-subtle)]">
              <Zap className="h-6 w-6 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="font-bold text-[var(--color-text-primary)]">Not Boosted</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                Your profile appears in standard order on bid lists.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* What You Get */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
          What Boosting Does
        </h2>
        <div className="space-y-3">
          {[
            { icon: <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />, text: 'Your profile appears at the top of the bid list for every job you apply to.' },
            { icon: <Shield className="h-4 w-4 text-[var(--color-primary)]" />, text: 'Employers reviewing bids see featured applicants first, marked with a badge.' },
            { icon: <Clock className="h-4 w-4 text-[var(--color-primary)]" />, text: `Boost lasts ${boostDays} day${boostDays !== 1 ? 's' : ''} from payment.` },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-[var(--color-text-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Purchase Section */}
      {!mateBoostEnabled ? (
        <Card className="p-5">
          <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Profile boosting is not currently available on this platform.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-2 border-yellow-400/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Boost For {boostDays} Days
              </p>
              <p className="text-3xl font-black text-[var(--color-text-primary)] mt-1">
                {currencySymbol}{boostFee.toFixed(2)}
                <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">{currency}</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">One-time payment. Non-refundable.</p>
            </div>
            <Zap className="h-10 w-10 text-yellow-400 flex-shrink-0" />
          </div>
          <Button
            variant="primary"
            className="w-full"
            disabled={creating || !!isActiveBoost}
            onClick={handleBoost}
          >
            {creating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
              </span>
            ) : isActiveBoost ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Already Boosted
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Boost My Profile — {currencySymbol}{boostFee.toFixed(2)}
              </span>
            )}
          </Button>
        </Card>
      )}

      {/* Stripe Payment Modal */}
      {clientSecret && (
        <StripePaymentModal
          isOpen={paymentModalOpen}
          onClose={() => { setPaymentModalOpen(false); setClientSecret(null); }}
          clientSecret={clientSecret}
          amount={boostFee}
          currency={currency}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
