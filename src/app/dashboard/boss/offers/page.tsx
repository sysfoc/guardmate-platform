'use client';

import React, { useEffect, useState } from 'react';
import { offerApi } from '@/lib/api/offer.api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import toast from 'react-hot-toast';
import type { IOffer } from '@/types/offer.types';
import { DiscountType, OfferEligibility } from '@/types/enums';
import { Tag, CheckCircle2, Clock, UserCheck, Loader2, Sparkles, Ban } from 'lucide-react';

export default function BossOffersPage() {
  const [offers, setOffers] = useState<IOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acquiringId, setAcquiringId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await offerApi.getActiveOffers();
        setOffers(data);
      } catch {
        toast.error('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAcquire = async (offer: IOffer) => {
    if (!offer._id) return;
    setAcquiringId(offer._id);
    try {
      await offerApi.acquireOffer(offer._id);
      // Refresh offers to reflect acquisition
      const data = await offerApi.getActiveOffers();
      setOffers(data);
      toast.success(`You acquired "${offer.name}"`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to acquire offer');
    } finally {
      setAcquiringId(null);
    }
  };

  if (loading) return <DashboardSkeleton />;

  const activeAcquired = offers.filter((o) => o.isAcquired && !o.isConsumed);
  const consumed = offers.filter((o) => o.isAcquired && o.isConsumed);
  const available = offers.filter((o) => !o.isAcquired);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
              <Tag className="h-6 w-6 text-[var(--color-primary)]" />
              Subscription Offers
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Acquire offers to reduce your monthly subscription fee. Each offer can only be used once.
            </p>
          </div>
        </div>

        {/* Active Acquired Offers (ready to use) */}
        {activeAcquired.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Ready to Use ({activeAcquired.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeAcquired.map((offer) => (
                <OfferCard key={offer._id} offer={offer} status="active" />
              ))}
            </div>
          </div>
        )}

        {/* Available Offers */}
        {available.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              Available to Acquire ({available.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {available.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                  status="available"
                  onAcquire={handleAcquire}
                  acquiring={acquiringId === offer._id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Consumed Offers */}
        {consumed.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Ban className="h-4 w-4 text-slate-400" />
              Already Used ({consumed.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consumed.map((offer) => (
                <OfferCard key={offer._id} offer={offer} status="consumed" />
              ))}
            </div>
          </div>
        )}

        {offers.length === 0 && (
          <Card className="p-8 text-center">
            <Tag className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-sm font-bold text-[var(--color-text-secondary)]">
              No active subscription offers right now.
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Check back later for new promotions.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  status,
  onAcquire,
  acquiring,
}: {
  offer: IOffer;
  status: 'active' | 'available' | 'consumed';
  onAcquire?: (o: IOffer) => void;
  acquiring?: boolean;
}) {
  const discountLabel =
    offer.discountType === DiscountType.FULL_WAIVER
      ? 'Full Waiver'
      : offer.discountType === DiscountType.PERCENTAGE_OFF
        ? `${offer.discountValue}% Off`
        : `Fixed ${offer.discountValue}%`;

  const eligibilityLabel =
    offer.eligibility === OfferEligibility.NEW_USERS_ONLY ? 'New Users Only' : 'All Users';

  const isActive = status === 'active';
  const isConsumed = status === 'consumed';

  return (
    <Card className={`p-5 relative overflow-hidden ${isActive ? 'border-emerald-200 bg-emerald-50/30' : isConsumed ? 'border-slate-200 bg-slate-50/30 opacity-70' : ''}`}>
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        {isActive && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        )}
        {isConsumed && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-200 text-slate-600">
            <Ban className="h-3 w-3" /> Used
          </span>
        )}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500/10' : isConsumed ? 'bg-slate-500/10' : 'bg-[var(--color-primary-light)]'}`}>
          <Tag className={`h-5 w-5 ${isActive ? 'text-emerald-600' : isConsumed ? 'text-slate-500' : 'text-[var(--color-primary)]'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate">{offer.name}</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{offer.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          {discountLabel}
        </span>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          Until {new Date(offer.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </span>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1">
          <UserCheck className="h-2.5 w-2.5" />
          {eligibilityLabel}
        </span>
      </div>

      {status === 'available' && onAcquire && (
        <Button
          size="sm"
          className="w-full"
          onClick={() => onAcquire(offer)}
          disabled={acquiring}
        >
          {acquiring ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          Acquire Offer
        </Button>
      )}

      {isActive && (
        <p className="text-xs text-emerald-700 font-medium text-center">
          This offer will be applied to your next subscription payment.
        </p>
      )}

      {isConsumed && (
        <p className="text-xs text-slate-500 font-medium text-center">
          This offer has already been used. It will not apply to future payments.
        </p>
      )}
    </Card>
  );
}
