'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { usePlatformContext } from '@/context/PlatformContext';
import { apiGet } from '@/lib/apiClient';
import { CreditCard, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

function BossPaymentsContent() {
  const { platformSettings } = usePlatformContext();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    // Check callback status from URL for PayPal
    const statusParam = searchParams.get('status');
    if (statusParam === 'success') {
      toast.success('Payment successfully approved. Escrow is now funded.');
    } else if (statusParam === 'cancelled') {
      toast('Payment was cancelled.', { icon: 'ℹ️' });
    }

    loadHistory();
  }, [searchParams]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // We don't have a specific boss-only history api, but we can reuse a GET /api/payments route 
      // or simply rely on the jobs list. For this UI, let's create a small local fetch block if an API 
      // is added, or show a placeholder note that payments are linked per job.
      
      // Let's implement a simple fetch from a custom route we can add or just an ad-hoc fetch
      // For now, if we didn't build a Boss Payment History route natively in Phase 4, 
      // we can simulate or instruct the user to view escrows on the Job Card directly.
      toast('Viewing escrow status is available directly on your Job details page.', { icon: 'ℹ️' });
      setPayments([]);

    } catch (err: any) {
      toast.error(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const currency = platformSettings?.platformCurrency || 'AUD';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12 p-6 md:p-0">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-indigo-600" />
          Payments & Escrow
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Review your funding history and escrowed payments. Funds enter escrow when you hire guards, and leave automatically when you approve their shifts.
        </p>
      </div>

      <Card className="p-8 text-center bg-indigo-50 border-indigo-100 flex flex-col items-center justify-center">
         <ShieldCheck className="w-12 h-12 text-indigo-400 mb-4" />
         <h3 className="text-xl font-bold text-indigo-900 mb-2">Secure Escrow System</h3>
         <p className="text-slate-600 max-w-lg mb-6">
           When you select "Fund Escrow" from a fully hired job, the payment is securely held by GuardMate. 
           It is only released to the guards after you click "Approve Shift" when the job is completed.
         </p>
      </Card>

      <Card className="p-0 overflow-hidden mt-6">
        <div className="p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Pending & Escrowed Jobs</h2>
        </div>
        <div className="p-12 text-center text-slate-500">
           <p className="text-sm">To fund a job or view specific job escrow status, please visit the <strong>My Jobs</strong> tab and click on the job details.</p>
        </div>
      </Card>
    </div>
  );
}

export default function BossPaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
       <BossPaymentsContent />
    </Suspense>
  )
}
