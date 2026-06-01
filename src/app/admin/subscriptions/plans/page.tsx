'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Settings, Save, ToggleLeft, ToggleRight, ArrowLeft,
  Briefcase, Users, Bot, BarChart2, FileText, UserCheck,
  DollarSign, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { subscriptionApi } from '@/lib/api/subscription.api';
import { SubscriptionTier } from '@/types/enums';
import type { ISubscriptionPlan } from '@/types/subscriptionPlan.types';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_ORDER: SubscriptionTier[] = [
  SubscriptionTier.STARTER,
  SubscriptionTier.PROFESSIONAL,
  SubscriptionTier.ENTERPRISE,
];

const TIER_COLORS: Record<SubscriptionTier, string> = {
  [SubscriptionTier.STARTER]:      'bg-[var(--color-bg-subtle)] border-[var(--color-surface-border)]',
  [SubscriptionTier.PROFESSIONAL]: 'bg-[var(--color-primary-light)] border-[var(--color-primary)]',
  [SubscriptionTier.ENTERPRISE]:   'bg-amber-50 border-amber-400 dark:bg-amber-950/20 dark:border-amber-500',
};

const TIER_BADGE: Record<SubscriptionTier, 'neutral' | 'info' | 'warning'> = {
  [SubscriptionTier.STARTER]:      'neutral',
  [SubscriptionTier.PROFESSIONAL]: 'info',
  [SubscriptionTier.ENTERPRISE]:   'warning',
};

interface PlanDraft extends ISubscriptionPlan {
  _dirty?: boolean;
}

const inputCls = 'w-full rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]';
const labelCls = 'block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide';

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<PlanDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SubscriptionTier | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await subscriptionApi.adminGetPlans();
      const sorted = TIER_ORDER.map((t) => data.find((p) => p.tier === t)).filter(Boolean) as ISubscriptionPlan[];
      setPlans(sorted.map((p) => ({ ...p, _dirty: false })));
    } catch {
      toast.error('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const updateField = (tier: SubscriptionTier, field: keyof ISubscriptionPlan, value: unknown) => {
    setPlans((prev) =>
      prev.map((p) => p.tier === tier ? { ...p, [field]: value, _dirty: true } : p)
    );
  };

  const handleSave = async (tier: SubscriptionTier) => {
    const plan = plans.find((p) => p.tier === tier);
    if (!plan) return;
    try {
      setSaving(tier);
      const { _dirty, _id, createdAt, updatedAt, tier: _tier, ...updates } = plan as any;
      await subscriptionApi.adminUpdatePlan(tier, updates);
      setPlans((prev) => prev.map((p) => p.tier === tier ? { ...p, _dirty: false } : p));
      toast.success(`${tier} plan saved.`);
    } catch {
      toast.error('Failed to save plan.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-[var(--color-bg-subtle)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/subscriptions" className="p-2 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Subscription Plans</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Configure pricing and features for each boss subscription tier.
          </p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.tier} className={`border-2 ${TIER_COLORS[plan.tier]} overflow-hidden`}>
            {/* Card Header */}
            <div className="p-5 border-b border-[var(--color-surface-border)]">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={TIER_BADGE[plan.tier]} className="text-xs font-bold uppercase tracking-wider px-3 py-1">
                  {plan.tier}
                </Badge>
                <button
                  onClick={() => updateField(plan.tier, 'isEnabled', !plan.isEnabled)}
                  title={plan.isEnabled ? 'Click to disable' : 'Click to enable'}
                  className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                >
                  {plan.isEnabled ? (
                    <>
                      <ToggleRight className="h-5 w-5 text-[var(--color-success)]" />
                      <span className="text-[var(--color-success)]">Enabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-5 w-5 text-[var(--color-text-muted)]" />
                      <span className="text-[var(--color-text-muted)]">Disabled</span>
                    </>
                  )}
                </button>
              </div>
              {plan._dirty && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</p>
              )}
            </div>

            {/* Fields */}
            <div className="p-5 space-y-4">
              {/* Monthly Price */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Monthly Price ($)</span>
                </label>
                <input type="number" min={0} step={0.01} value={plan.monthlyPrice}
                  onChange={(e) => updateField(plan.tier, 'monthlyPrice', Number(e.target.value))}
                  className={inputCls} />
              </div>

              {/* Max Active Jobs */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Max Active Jobs</span>
                </label>
                <input type="number" min={1} step={1} value={plan.maxActiveJobs}
                  onChange={(e) => updateField(plan.tier, 'maxActiveJobs', Number(e.target.value))}
                  className={inputCls} />
              </div>

              {/* Max Guards Per Job */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Max Guards Per Job</span>
                </label>
                <input type="number" min={1} step={1} value={plan.maxGuardsPerJob}
                  onChange={(e) => updateField(plan.tier, 'maxGuardsPerJob', Number(e.target.value))}
                  className={inputCls} />
              </div>

              {/* Max Draft Jobs */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Max Draft Jobs</span>
                </label>
                <input type="number" min={0} step={1} value={plan.maxDraftJobs}
                  onChange={(e) => updateField(plan.tier, 'maxDraftJobs', Number(e.target.value))}
                  className={inputCls} />
              </div>

              {/* Boolean Toggles */}
              <div className="space-y-3 pt-1 border-t border-[var(--color-surface-border)]">
                <FeatureToggle
                  icon={<Bot className="h-3.5 w-3.5" />}
                  label="AI Guard Matching"
                  enabled={plan.aiGuardMatchingEnabled}
                  onChange={(v) => updateField(plan.tier, 'aiGuardMatchingEnabled', v)}
                />
                <FeatureToggle
                  icon={<BarChart2 className="h-3.5 w-3.5" />}
                  label="Analytics & Reports"
                  enabled={plan.analyticsEnabled}
                  onChange={(v) => updateField(plan.tier, 'analyticsEnabled', v)}
                />
                <FeatureToggle
                  icon={<UserCheck className="h-3.5 w-3.5" />}
                  label="Full Guard Profile Access"
                  enabled={plan.fullGuardProfileAccess}
                  onChange={(v) => updateField(plan.tier, 'fullGuardProfileAccess', v)}
                />
                <FeatureToggle
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label="Job Boost Included"
                  enabled={plan.boostJobsEnabled ?? false}
                  onChange={(v) => updateField(plan.tier, 'boostJobsEnabled', v)}
                />
              </div>

              {/* Max Boosted Jobs */}
              {(plan.boostJobsEnabled) && (
                <div>
                  <label className={labelCls}>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Max Boosted Jobs</span>
                  </label>
                  <input type="number" min={0} step={1} value={plan.maxBoostedJobs ?? 0}
                    onChange={(e) => updateField(plan.tier, 'maxBoostedJobs', Number(e.target.value))}
                    className={inputCls} />
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="px-5 pb-5">
              <Button
                variant="primary"
                className="w-full"
                disabled={!plan._dirty || saving === plan.tier}
                onClick={() => handleSave(plan.tier)}
              >
                {saving === plan.tier ? (
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4 animate-spin" /> Saving...</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Changes</span>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Toggle Row ───────────────────────────────────────────────────────
function FeatureToggle({
  icon, label, enabled, onChange,
}: { icon: React.ReactNode; label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
        <span className="text-[var(--color-text-muted)]">{icon}</span>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-border)]'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}
