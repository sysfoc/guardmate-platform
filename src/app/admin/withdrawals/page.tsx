'use client';

import React, { useState, useEffect } from 'react';
import { getAdminWithdrawals, completeWithdrawal } from '@/lib/api/admin.api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import { 
  ArrowDownToLine, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Building,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { WithdrawalStatus, WithdrawalMethod } from '@/types/enums';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await getAdminWithdrawals({ page, limit: 10, status: statusFilter, method: methodFilter });
      if (res.success) {
        setWithdrawals(res.data || []);
        setTotalPages(res.pagination?.pages || 1);
      }
    } catch (error: any) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [page, statusFilter, methodFilter]);

  const handleCompleteManual = async (id: string) => {
    if (!window.confirm("Are you sure you have manually transferred the funds to the guard's bank account? This action cannot be undone and will send an email confirmation to the guard.")) {
      return;
    }

    try {
      setIsProcessingId(id);
      const res = await completeWithdrawal(id);
      if (res.success) {
        toast.success(res.message);
        loadWithdrawals();
      } else {
        toast.error(res.message);
      }
    } catch (error: any) {
      toast.error('Failed to complete withdrawal');
    } finally {
      setIsProcessingId(null);
    }
  };

  const pendingManualCount = withdrawals.filter(w => w.status === WithdrawalStatus.PENDING && w.withdrawalMethod === WithdrawalMethod.BANK_TRANSFER).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <ArrowDownToLine className="h-6 w-6 text-blue-600" />
            Withdrawal Management
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Review and process guard withdrawal requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-lg">
                <ArrowDownToLine className="h-5 w-5" />
             </div>
             <div>
                <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">Total Requests</p>
                <p className="text-2xl font-bold">{withdrawals.length}</p>
             </div>
          </div>
        </Card>
        
        <Card className={`p-4 border-0 ${pendingManualCount > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)]'}`}>
          <div className="flex items-center gap-3">
             <div className={pendingManualCount > 0 ? 'bg-white/20 p-2 rounded-lg' : 'bg-amber-100 text-amber-600 p-2 rounded-lg'}>
                <Clock className="h-5 w-5" />
             </div>
             <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${pendingManualCount > 0 ? 'text-amber-100' : 'text-[var(--color-text-secondary)]'}`}>Pending Manual</p>
                <p className="text-2xl font-bold">{pendingManualCount}</p>
             </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border border-[var(--color-border)] shadow-sm">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-wrap gap-4 items-center justify-between">
           <div className="flex gap-2">
             <select 
               className="h-9 px-3 rounded-md border border-[var(--color-input-border)] bg-[var(--color-bg-primary)] text-sm focus:ring-2 focus:ring-blue-500"
               value={statusFilter}
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
             >
               <option value="">All Statuses</option>
               <option value={WithdrawalStatus.PENDING}>Pending</option>
               <option value={WithdrawalStatus.PROCESSING}>Processing</option>
               <option value={WithdrawalStatus.COMPLETED}>Completed</option>
               <option value={WithdrawalStatus.FAILED}>Failed</option>
             </select>
             
             <select 
               className="h-9 px-3 rounded-md border border-[var(--color-input-border)] bg-[var(--color-bg-primary)] text-sm focus:ring-2 focus:ring-blue-500"
               value={methodFilter}
               onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
             >
               <option value="">All Methods</option>
               <option value={WithdrawalMethod.STRIPE_BANK}>Stripe Connect</option>
               <option value={WithdrawalMethod.PAYPAL}>PayPal</option>
               <option value={WithdrawalMethod.BANK_TRANSFER}>Manual Bank Transfer</option>
             </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Guard</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method & Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-bg-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-secondary)]">Loading withdrawals...</td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-center justify-center">
                      <ArrowDownToLine className="h-8 w-8 mb-2 opacity-20" />
                      <p>No withdrawals found matching the criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-0">
                          <div className="text-sm font-medium text-[var(--color-text-primary)]">
                            {w.guard?.firstName} {w.guard?.lastName}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">{w.guard?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-600">{w.currency} {w.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 w-fit">
                           {w.withdrawalMethod === WithdrawalMethod.STRIPE_BANK && <><CreditCard className="w-3 h-3" /> Stripe Bank</>}
                           {w.withdrawalMethod === WithdrawalMethod.PAYPAL && <><DollarSign className="w-3 h-3" /> PayPal</>}
                           {w.withdrawalMethod === WithdrawalMethod.BANK_TRANSFER && <><Building className="w-3 h-3" /> Direct Bank</>}
                        </div>
                        {w.withdrawalMethod === WithdrawalMethod.BANK_TRANSFER && w.walletDetails && (
                           <div className="mt-1 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] p-2 rounded border border-[var(--color-border)]">
                              <p><span className="font-medium text-[var(--color-text-primary)]">Name:</span> {w.walletDetails.bankAccountName}</p>
                              <p><span className="font-medium text-[var(--color-text-primary)]">BSB:</span> {w.walletDetails.bankBSB}</p>
                              <p><span className="font-medium text-[var(--color-text-primary)]">Account:</span> {w.walletDetails.bankAccountNumber}</p>
                           </div>
                        )}
                        {w.withdrawalMethod === WithdrawalMethod.PAYPAL && w.walletDetails && (
                           <div className="text-xs text-[var(--color-text-secondary)]">{w.walletDetails.paypalEmail}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {w.status === WithdrawalStatus.PENDING && <Badge variant="warning" size="sm"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                      {w.status === WithdrawalStatus.PROCESSING && <Badge variant="info" size="sm"><Clock className="w-3 h-3 mr-1" /> Processing</Badge>}
                      {w.status === WithdrawalStatus.COMPLETED && <Badge variant="success" size="sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>}
                      {w.status === WithdrawalStatus.FAILED && <Badge variant="danger" size="sm"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>}
                      
                      {w.status === WithdrawalStatus.FAILED && w.failureReason && (
                        <p className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={w.failureReason}>
                          {w.failureReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--color-text-secondary)]">
                      {new Date(w.requestedAt).toLocaleDateString('en-AU', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {w.withdrawalMethod === WithdrawalMethod.BANK_TRANSFER && w.status === WithdrawalStatus.PENDING && (
                        <Button 
                          size="sm" 
                          variant="primary" 
                          onClick={() => handleCompleteManual(w._id)}
                          disabled={isProcessingId === w._id}
                        >
                          {isProcessingId === w._id ? 'Processing...' : 'Mark Completed'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
