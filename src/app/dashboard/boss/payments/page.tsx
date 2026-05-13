'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { usePlatformContext } from '@/context/PlatformContext';
import { getMyPayments, capturePaypalOrder } from '@/lib/api/payment.api';
import type { IPayment } from '@/types/payment.types';
import { EscrowPaymentStatus, PaymentMethod } from '@/types/enums';
import {
  CreditCard, ShieldCheck, Wallet, ArrowUpRight, Clock,
  CheckCircle2, Lock, Banknote, ChevronRight, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EnrichedPayment extends IPayment {
  jobStatus: string | null;
  guardName: string | null;
}

function BossPaymentsContent() {
  const { platformSettings } = usePlatformContext();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<EnrichedPayment[]>([]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const paypalToken = searchParams.get('token');

    if (statusParam === 'success') {
      if (paypalToken) {
        capturePaypalOrder(paypalToken).then((res) => {
          if (res.success) toast.success('Payment captured. Escrow is now funded.');
          else toast.error(res.message || 'Failed to capture PayPal payment.');
          loadHistory();
        }).catch(() => {
          toast.error('Failed to capture PayPal payment.');
          loadHistory();
        });
        return;
      } else {
        toast.success('Payment approved. Escrow is now funded.');
      }
    } else if (statusParam === 'cancelled') {
      toast('Payment was cancelled.', { icon: 'ℹ️' });
    }

    loadHistory();
  }, [searchParams]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await getMyPayments();
      if (res.success && res.data) {
        setPayments(res.data);
      } else {
        toast.error(res.message || 'Failed to load payment history');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const currency = '$';

  // Summary calculations
  const totalSpent = payments.reduce((sum, p) => sum + (p.totalChargedToBoss || 0), 0);
  const totalInEscrow = payments
    .filter((p) => p.paymentStatus === EscrowPaymentStatus.HELD)
    .reduce((sum, p) => sum + (p.totalChargedToBoss || 0), 0);
  const totalReleased = payments
    .filter((p) => p.paymentStatus === EscrowPaymentStatus.RELEASED)
    .reduce((sum, p) => sum + (p.totalChargedToBoss || 0), 0);
  const totalFees = payments.reduce((sum, p) => sum + (p.bossCommissionAmount || 0), 0);

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    [EscrowPaymentStatus.PENDING]: {
      label: 'Pending',
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
    [EscrowPaymentStatus.HELD]: {
      label: 'In Escrow',
      icon: <Lock className="w-3.5 h-3.5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    [EscrowPaymentStatus.RELEASED]: {
      label: 'Released',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-slate-600',
      bg: 'bg-slate-50 border-slate-200',
    },
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            Payments & Escrow
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Track your payments, escrow balances, and transaction history.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={<Wallet className="w-5 h-5 text-indigo-600" />}
            label="Total Spent"
            value={`${currency} ${totalSpent.toFixed(2)}`}
            subLabel={`${payments.length} transaction${payments.length !== 1 ? 's' : ''}`}
          />
          <SummaryCard
            icon={<Lock className="w-5 h-5 text-emerald-600" />}
            label="In Escrow"
            value={`${currency} ${totalInEscrow.toFixed(2)}`}
            subLabel="Awaiting shift approval"
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5 text-slate-600" />}
            label="Released"
            value={`${currency} ${totalReleased.toFixed(2)}`}
            subLabel="Paid to guards"
          />
          <SummaryCard
            icon={<Banknote className="w-5 h-5 text-amber-600" />}
            label="Platform Fees"
            value={`${currency} ${totalFees.toFixed(2)}`}
            subLabel="Total commission paid"
          />
        </div>

        {/* Payment History */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Transaction History
            </h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />}
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-sm font-bold text-[var(--color-text-secondary)]">No payments yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Payments will appear here after you fund escrow for a job.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-primary)]">
              {payments.map((p) => {
                const status = statusConfig[p.paymentStatus] || statusConfig[EscrowPaymentStatus.PENDING];
                const methodIcon = p.paymentMethod === PaymentMethod.STRIPE
                  ? <CreditCard className="w-3.5 h-3.5" />
                  : <Wallet className="w-3.5 h-3.5" />;

                return (
                  <div key={p._id} className="p-4 hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Job info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/dashboard/boss/jobs/${p.jobId}`}
                            className="text-sm font-bold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate"
                          >
                            {p.jobTitle}
                          </Link>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                          <span className="inline-flex items-center gap-1">
                            {methodIcon}
                            {p.paymentMethod}
                          </span>
                          {p.guardName && (
                            <span>Guard: {p.guardName}</span>
                          )}
                          <span>{formatDate(p.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right: Amount & Status */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-[var(--color-text-primary)]">
                          {currency} {p.totalChargedToBoss.toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${status.bg} ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown row */}
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]/60 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-[var(--color-text-muted)]">Job Budget</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{currency} {p.jobBudget.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-muted)]">Platform Fee</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{currency} {p.bossCommissionAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-muted)]">Guard Receives</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{currency} {p.guardPayout.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-[var(--color-bg-secondary)] rounded-md">{icon}</div>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <p className="text-xl font-extrabold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{subLabel}</p>
    </Card>
  );
}

function formatDate(date: string | Date | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BossPaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <BossPaymentsContent />
    </Suspense>
  );
}
