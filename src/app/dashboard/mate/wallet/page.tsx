'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePlatformContext } from '@/context/PlatformContext';
import { 
  getWalletBalance, 
  onboardStripeConnect, 
  checkStripeConnectStatus, 
  setPaypalEmail, 
  requestWithdrawal,
  getEarnings,
  getWithdrawals
} from '@/lib/api/payment.api';
import { PaymentMethod } from '@/types/enums';
import { Wallet, DollarSign, ExternalLink, ArrowDownToLine, Clock, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function WalletPageContent() {
  const { platformSettings } = usePlatformContext();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  
  const [earnings, setEarnings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const [pEmail, setPEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod | ''>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    // Check callback status from URL
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success') {
      toast.success('Stripe Connect onboarding completed!');
    } else if (stripeParam === 'refresh') {
      toast('Stripe Connect onboarding refreshed.', { icon: 'ℹ️' });
    }

    loadData();
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletRes, stripeRes, earnRes, withRes] = await Promise.all([
        getWalletBalance(),
        checkStripeConnectStatus(),
        getEarnings(1, 10),
        getWithdrawals(1, 10)
      ]);

      if (walletRes.success) {
        setWallet(walletRes.data);
        if (walletRes.data.paypalEmail) setPEmail(walletRes.data.paypalEmail);
      }
      if (stripeRes.success) setStripeStatus(stripeRes.data);
      if (earnRes.success) setEarnings(earnRes.data);
      if (withRes.success) setWithdrawals(withRes.data);

    } catch (err: any) {
      toast.error(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeOnboard = async () => {
    try {
      // For Guards, default to AU unless platform sets another country. 
      // Platform settings has platformCountry.
      const targetCountry = platformSettings?.platformCountry?.countryCode || 'AU';
      const res = await onboardStripeConnect(targetCountry);
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Could not start Stripe onboarding.');
    }
  };

  const handleUpdatePaypal = async () => {
    if (!pEmail || !/\S+@\S+\.\S+/.test(pEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    try {
      setIsUpdatingEmail(true);
      const res = await setPaypalEmail(pEmail);
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Failed to update PayPal email.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    const minW = platformSettings?.minimumWithdrawalAmount || 50;
    if (amount < minW) {
      toast.error(`Minimum withdrawal amount is ${platformSettings?.platformCurrency || 'AUD'} ${minW}`);
      return;
    }
    if (amount > wallet.availableBalance) {
      toast.error('Insufficient available balance.');
      return;
    }
    if (!withdrawMethod) {
      toast.error('Please select a withdrawal method.');
      return;
    }

    try {
      setIsWithdrawing(true);
      const res = await requestWithdrawal(amount, withdrawMethod);
      if (res.success) {
        toast.success(res.message);
        setWithdrawAmount('');
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

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading wallet...</div>;
  }

  const currency = platformSettings?.platformCurrency || 'AUD';
  const hasStripe = platformSettings?.stripeConnectEnabled;
  const hasPaypal = platformSettings?.paypalEnabled;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12 p-6 md:p-0">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
          <Wallet className="h-6 w-6 text-blue-600" />
          Mate Wallet
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage your earnings, view platform payouts, and request withdrawals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 border-0 flex flex-col justify-between">
          <div>
             <p className="text-blue-100 font-medium">Available Balance</p>
             <h2 className="text-4xl font-extrabold text-white mt-2">
               {currency} {(wallet?.availableBalance || 0).toFixed(2)}
             </h2>
          </div>
          <div className="mt-8 pt-4 border-t border-white/20 text-blue-100 flex justify-between text-sm">
            <span>Total Earned:</span>
            <span className="font-bold">{currency} {(wallet?.totalEarned || 0).toFixed(2)}</span>
          </div>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
           {hasStripe && (
              <Card className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-500"/> Stripe Connect</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {stripeStatus?.verified 
                      ? "Your account is verified. You can receive direct bank payouts." 
                      : "Link your bank account to receive withdrawals via Stripe."}
                  </p>
                </div>
                <div className="mt-4">
                  {stripeStatus?.verified ? (
                    <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={handleStripeOnboard}>
                      Manage Stripe Account <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleStripeOnboard} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      Setup Bank Account <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  )}
                </div>
              </Card>
           )}

           {hasPaypal && (
             <Card className="p-6 flex flex-col justify-between">
               <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-500"/> PayPal Email</h3>
                  <p className="text-sm text-slate-500 mt-2">Receive payouts directly to your PayPal account.</p>
                  <div className="mt-3 flex gap-2">
                     <input 
                       type="email" 
                       value={pEmail}
                       onChange={e => setPEmail(e.target.value)}
                       placeholder="you@example.com"
                       className="flex-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
                     />
                     <Button 
                       disabled={isUpdatingEmail || !pEmail} 
                       onClick={handleUpdatePaypal}
                       variant={wallet?.paypalEmail === pEmail ? 'outline' : 'primary'}
                     >
                       Save
                     </Button>
                  </div>
               </div>
             </Card>
           )}
        </div>
      </div>

      <Card className="p-6 border-emerald-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
          Request Withdrawal
        </h3>
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="w-full md:w-1/3 flex flex-col space-y-2">
            <label className="text-sm font-medium text-slate-700">Amount ({currency})</label>
            <input 
               type="number"
               min={platformSettings?.minimumWithdrawalAmount || 50}
               max={wallet?.availableBalance || 0}
               value={withdrawAmount}
               onChange={e => setWithdrawAmount(e.target.value)}
               placeholder="0.00"
               className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-1/3 flex flex-col space-y-2">
             <label className="text-sm font-medium text-slate-700">Method</label>
             <select 
                value={withdrawMethod} 
                onChange={e => setWithdrawMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 bg-white"
             >
                <option value="">Select Method...</option>
                {hasStripe && stripeStatus?.verified && <option value={PaymentMethod.STRIPE}>Stripe (Bank Transfer)</option>}
                {hasPaypal && wallet?.paypalEmail && <option value={PaymentMethod.PAYPAL}>PayPal ({wallet.paypalEmail})</option>}
             </select>
          </div>
          <div className="w-full md:w-1/3">
             <Button 
               disabled={isWithdrawing || !withdrawAmount || !withdrawMethod || Number(withdrawAmount) > wallet?.availableBalance}
               onClick={handleWithdraw}
               className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 h-[42px]"
             >
                {isWithdrawing ? 'Processing...' : 'Withdraw Funds'}
             </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
           Minimum withdrawal is {currency} {platformSettings?.minimumWithdrawalAmount || 50}. Funds may take 1-3 business days to appear in your account depending on the method.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Earnings History</h3>
            </div>
            <div className="p-0">
               {earnings.length === 0 ? (
                 <div className="p-8 text-center text-slate-500 text-sm">No earnings yet. Complete jobs to earn money.</div>
               ) : (
                 <table className="w-full text-sm">
                   <tbody>
                      {earnings.map((e, idx) => (
                         <tr key={idx} className="border-b last:border-0 border-slate-100 hover:bg-slate-50">
                            <td className="p-4">
                               <div className="font-medium text-slate-800">{e.jobTitle}</div>
                               <div className="text-xs text-slate-500">{new Date(e.releasedAt).toLocaleDateString()}</div>
                            </td>
                            <td className="p-4 text-right font-bold text-emerald-600">
                               +{e.currency} {e.guardPayout.toFixed(2)}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                 </table>
               )}
            </div>
         </Card>

         <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><ArrowDownToLine className="w-4 h-4" /> Withdrawals</h3>
            </div>
            <div className="p-0">
               {withdrawals.length === 0 ? (
                 <div className="p-8 text-center text-slate-500 text-sm">No withdrawal history.</div>
               ) : (
                 <table className="w-full text-sm">
                   <tbody>
                      {withdrawals.map((w, idx) => (
                         <tr key={idx} className="border-b last:border-0 border-slate-100 hover:bg-slate-50">
                            <td className="p-4">
                               <div className="font-medium text-slate-800 flex items-center gap-2">
                                  {w.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                  {w.status === 'PROCESSING' && <Clock className="w-4 h-4 text-amber-500" />}
                                  {w.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                                  {w.withdrawalMethod}
                               </div>
                               <div className="text-xs text-slate-500">{new Date(w.requestedAt).toLocaleDateString()}</div>
                            </td>
                            <td className="p-4 text-right">
                               <div className="font-bold text-slate-800">-{w.currency} {w.amount.toFixed(2)}</div>
                               {w.status === 'FAILED' && <div className="text-xs text-red-500 max-w-[120px] truncate" title={w.failureReason}>{w.failureReason}</div>}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                 </table>
               )}
            </div>
         </Card>
      </div>

    </div>
  );
}

export default function GuardWalletPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
       <WalletPageContent />
    </Suspense>
  )
}
