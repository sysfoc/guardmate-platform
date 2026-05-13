'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePlatformContext } from '@/context/PlatformContext';
import {
  getWalletBalance,
  requestWithdrawal,
  getEarnings,
  getWithdrawals,
  saveBankDetails
} from '@/lib/api/payment.api';
import { WithdrawalMethod } from '@/types/enums';
import {
  Wallet, DollarSign, ExternalLink, ArrowDownToLine, Clock,
  CheckCircle2, XCircle, Building, CreditCard, Loader2,
  TrendingUp, TrendingDown
} from 'lucide-react';
import toast from 'react-hot-toast';

function WalletPageContent() {
  const { platformSettings } = usePlatformContext();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);

  const [earnings, setEarnings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Bank Transfer
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankBsb, setBankBsb] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const [isBankSaved, setIsBankSaved] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod | ''>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletRes, earnRes, withRes] = await Promise.all([
        getWalletBalance(),
        getEarnings(1, 10),
        getWithdrawals(1, 10)
      ]);

      if (walletRes.success) {
        setWallet(walletRes.data);
        if (walletRes.data.bankAccountNumber) {
          setIsBankSaved(true);
          setBankAccountName(walletRes.data.bankAccountName || '');
          setBankBsb(walletRes.data.bankBSB || '');
          setBankAccountNumber(walletRes.data.bankAccountNumber || '');
        }
      }
      if (earnRes.success) setEarnings(earnRes.data);
      if (withRes.success) setWithdrawals(withRes.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBank = async () => {
    if (!bankAccountName || !bankBsb || !bankAccountNumber) {
      toast.error('Please fill in all bank details.');
      return;
    }
    try {
      setIsUpdatingBank(true);
      const res = await saveBankDetails({
        accountName: bankAccountName,
        bsb: bankBsb,
        accountNumber: bankAccountNumber
      });
      if (res.success) { toast.success(res.message); loadData(); }
      else toast.error(res.message);
    } catch {
      toast.error('Failed to save bank details.');
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    const minW = platformSettings?.minimumWithdrawalAmount || 50;
    if (amount < minW) { toast.error(`Min withdrawal: ${currency} ${minW}`); return; }
    if (amount > wallet.availableBalance) { toast.error('Insufficient balance.'); return; }
    if (!withdrawMethod) { toast.error('Select a withdrawal method.'); return; }
    if (!window.confirm(`Withdraw ${currency} ${amount} via ${withdrawMethod}?`)) return;

    try {
      setIsWithdrawing(true);
      const res = await requestWithdrawal(amount, withdrawMethod);
      if (res.success) {
        toast.success(res.message);
        setWithdrawAmount('');
        setWithdrawMethod('');
        loadData();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const currency = '$';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            Mate Wallet
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage earnings, withdrawals, and payout methods.
          </p>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Card className="p-4 bg-gradient-to-br from-indigo-500 to-blue-600 border-0">
            <p className="text-xs font-medium text-indigo-100">Available Balance</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {currency} {(wallet?.availableBalance || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-indigo-200 mt-1">
              Ready to withdraw
            </p>
          </Card>
          <SummaryCard
            icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            label="Total Earned"
            value={`${currency} ${(wallet?.totalEarned || 0).toFixed(2)}`}
            subLabel="Lifetime earnings"
          />
          <SummaryCard
            icon={<TrendingDown className="w-4 h-4 text-slate-600" />}
            label="Total Withdrawn"
            value={`${currency} ${(wallet?.totalWithdrawn || 0).toFixed(2)}`}
            subLabel="Paid out to you"
          />
        </div>

        {/* Payout Methods + Withdrawal — side by side on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 items-stretch">
          {/* Left: Payout Methods (3/5) — single card with sections */}
          <Card className="p-0 h-full flex flex-col lg:col-span-3 overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <h2 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Payout Methods
              </h2>
            </div>
            <div className="p-4 space-y-4 flex-1">
              {/* Direct Bank */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3 w-full min-w-0">
                  <div className="p-1.5 bg-emerald-50 rounded-md shrink-0 mt-0.5">
                    <Building className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Direct Bank</h3>
                    {isBankSaved && !isUpdatingBank ? (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{bankAccountName}</p>
                        <p className="text-[10px] text-[var(--color-text-secondary)] truncate">BSB: {bankBsb} &middot; Acct: {bankAccountNumber}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 w-full mt-2">
                        <input
                          type="text"
                          value={bankAccountName}
                          onChange={e => setBankAccountName(e.target.value)}
                          placeholder="Account Name"
                          className="w-full rounded-md border border-[var(--color-border-primary)] px-2.5 py-1.5 text-xs focus:border-[var(--color-primary)] outline-none bg-[var(--color-bg-primary)]"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={bankBsb}
                            onChange={e => setBankBsb(e.target.value)}
                            placeholder="BSB"
                            className="w-full rounded-md border border-[var(--color-border-primary)] px-2.5 py-1.5 text-xs focus:border-[var(--color-primary)] outline-none bg-[var(--color-bg-primary)]"
                          />
                          <input
                            type="text"
                            value={bankAccountNumber}
                            onChange={e => setBankAccountNumber(e.target.value)}
                            placeholder="Account Number"
                            className="w-full rounded-md border border-[var(--color-border-primary)] px-2.5 py-1.5 text-xs focus:border-[var(--color-primary)] outline-none bg-[var(--color-bg-primary)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 sm:mt-0 mt-2">
                  {isBankSaved && !isUpdatingBank ? (
                    <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setIsBankSaved(false)}>
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="text-xs h-8"
                        disabled={isUpdatingBank || !bankAccountName || !bankBsb || !bankAccountNumber}
                        onClick={handleUpdateBank}
                      >
                        {wallet?.bankAccountNumber ? 'Update' : 'Save'}
                      </Button>
                      {wallet?.bankAccountNumber && (
                        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setIsBankSaved(true)}>
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Request Withdrawal (2/5) */}
          <Card className="p-0 h-full flex flex-col lg:col-span-2 overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center gap-2">
              <ArrowDownToLine className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Request Withdrawal
              </h3>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  min={platformSettings?.minimumWithdrawalAmount || 50}
                  max={wallet?.availableBalance || 0}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-[var(--color-border-primary)] px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none bg-[var(--color-bg-primary)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                  Method
                </label>
                <select
                  value={withdrawMethod}
                  onChange={e => setWithdrawMethod(e.target.value as WithdrawalMethod)}
                  className="w-full rounded-md border border-[var(--color-border-primary)] px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none bg-[var(--color-bg-primary)]"
                >
                  <option value="">Select method...</option>
                  {wallet?.bankAccountNumber && (
                    <option value={WithdrawalMethod.BANK_TRANSFER}>Direct Bank ({wallet.bankAccountNumber})</option>
                  )}
                </select>
              </div>
              <Button
                disabled={isWithdrawing || !withdrawAmount || !withdrawMethod || Number(withdrawAmount) > wallet?.availableBalance}
                onClick={handleWithdraw}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-[38px] text-sm"
              >
                {isWithdrawing ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
            <div className="p-3 border-t border-[var(--color-border-primary)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">
                Minimum: {currency} {platformSettings?.minimumWithdrawalAmount || 50}. Processing 1-3 business days.
              </p>
            </div>
          </Card>
        </div>

        {/* History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings */}
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Earnings History
              </h3>
            </div>
            {earnings.length === 0 ? (
              <div className="p-8 text-center">
                <DollarSign className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--color-text-secondary)]">No earnings yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border-primary)]">
                {earnings.map((e, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{e.jobTitle}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {e.releasedAt ? new Date(e.releasedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 shrink-0 ml-3">
                      +{e.currency || currency} {e.guardPayout?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Withdrawals */}
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center gap-2">
              <ArrowDownToLine className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Withdrawals
              </h3>
            </div>
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowDownToLine className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--color-text-secondary)]">No withdrawals yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border-primary)]">
                {withdrawals.map((w, idx) => {
                  const statusCfg = getWithdrawalStatus(w.status);
                  return (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {statusCfg.icon}
                          <span className="text-xs font-bold text-[var(--color-text-primary)]">{w.withdrawalMethod}</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                        {w.status === 'FAILED' && w.failureReason && (
                          <p className="text-[10px] text-red-500 truncate max-w-[180px]" title={w.failureReason}>{w.failureReason}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-extrabold text-[var(--color-text-primary)]">
                          -{w.currency || currency} {w.amount?.toFixed(2)}
                        </p>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} mt-0.5`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
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
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 bg-[var(--color-bg-secondary)] rounded-md">{icon}</div>
        <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-extrabold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{subLabel}</p>
    </Card>
  );
}

function getWithdrawalStatus(status: string) {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200',
      };
    case 'PROCESSING':
      return {
        label: 'Processing',
        icon: <Clock className="w-3 h-3 text-amber-500" />,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        icon: <XCircle className="w-3 h-3 text-red-500" />,
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200',
      };
    default:
      return {
        label: 'Pending',
        icon: <Clock className="w-3 h-3 text-slate-400" />,
        color: 'text-slate-600',
        bg: 'bg-slate-50 border-slate-200',
      };
  }
}

export default function GuardWalletPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <WalletPageContent />
    </Suspense>
  );
}
