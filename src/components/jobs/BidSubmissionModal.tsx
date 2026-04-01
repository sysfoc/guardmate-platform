'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PoundSterling, Calendar, FileText, Send, Building2, Lock, AlertCircle } from 'lucide-react';
import type { SubmitBidPayload } from '@/types/job.types';
import type { IJob } from '@/types/job.types';

interface BidSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SubmitBidPayload) => Promise<void>;
  job: IJob;
  isSubmitting: boolean;
  apiError?: string | null;
  abnVerified?: boolean;
  abrVerificationEnabled?: boolean;
}

export function BidSubmissionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  job, 
  isSubmitting, 
  apiError,
  abnVerified = false,
  abrVerificationEnabled = false
}: BidSubmissionModalProps) {
  const [proposedRate, setProposedRate] = useState<string>(String(job.budgetAmount || ''));
  const [coverMessage, setCoverMessage] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLockedRate = abrVerificationEnabled && !abnVerified;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!proposedRate || Number(proposedRate) <= 0) e.proposedRate = 'Enter a valid rate.';
    if (!coverMessage.trim()) e.coverMessage = 'Cover message is required.';
    else if (coverMessage.length > 1000) e.coverMessage = 'Max 1000 characters.';
    if (!availableFrom) e.availableFrom = 'Select your available date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({
      proposedRate: Number(proposedRate),
      budgetType: job.budgetType,
      totalProposed: Number(proposedRate),
      coverMessage: coverMessage.trim(),
      availableFrom,
    });
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for this Job" size="md">
      <div className="space-y-5 p-1">
        <div className="bg-[var(--color-bg-subtle)] rounded-lg p-3">
          <p className="font-bold text-sm text-[var(--color-text-primary)]">{job.title}</p>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
            {job.companyName} • {job.locationCity} • {job.budgetType === 'HOURLY' ? `£${job.budgetAmount}/hr` : `£${job.budgetAmount} fixed`}
          </p>
        </div>

        {/* ABN Restriction Notice */}
        {abrVerificationEnabled && (
          <div className={`p-3 rounded-lg ${abnVerified ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-amber-500/5 border border-amber-500/20'}`}>
            <div className="flex items-start gap-2">
              {abnVerified ? (
                <Building2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-xs font-medium ${abnVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {abnVerified 
                    ? 'Your ABN is verified. You can propose your own rate for this job.'
                    : 'Your rate is locked to the posted amount. Verify your ABN to propose custom rates.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {apiError && (
          <div className="bg-[var(--color-danger-light)] text-[var(--color-danger)] p-3 rounded-lg text-xs font-bold flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-[var(--color-input-label)] mb-1.5 block">
            Your Proposed Rate ({job.budgetType === 'HOURLY' ? '£/hour' : '£ fixed'})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-bold text-sm">£</span>
            <input 
              type="number" 
              step="0.01" 
              min="0" 
              value={proposedRate} 
              onChange={(e) => setProposedRate(e.target.value)} 
              placeholder="0.00" 
              className={`${inputCls} pl-8 ${isLockedRate ? 'bg-[var(--color-bg-tertiary)] cursor-not-allowed' : ''}`}
              disabled={isLockedRate}
            />
            {isLockedRate && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              </div>
            )}
          </div>
          {errors.proposedRate && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.proposedRate}</p>}
          {isLockedRate && (
            <p className="text-[10px] text-amber-500 mt-1">
              Rate is locked to posted amount. <a href="/dashboard/mate/profile" className="underline">Verify your ABN</a> to set custom rates.
            </p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold text-[var(--color-input-label)] mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Cover Message</span>
            <span className={`text-[9px] ${coverMessage.length > 1000 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>{coverMessage.length}/1000</span>
          </label>
          <textarea value={coverMessage} onChange={(e) => setCoverMessage(e.target.value)} placeholder="Introduce yourself..." rows={5} maxLength={1000} className={`${inputCls} resize-none`} />
          {errors.coverMessage && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.coverMessage}</p>}
        </div>

        <div>
          <label className="text-[11px] font-bold text-[var(--color-input-label)] mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Available From
          </label>
          <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputCls} />
          {errors.availableFrom && <p className="text-[10px] text-[var(--color-danger)] mt-1">{errors.availableFrom}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} leftIcon={<Send className="h-3.5 w-3.5" />} className="flex-1 shadow-md shadow-[var(--color-primary)]/10">
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
