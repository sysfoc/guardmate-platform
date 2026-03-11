'use client';

/**
 * BossDashboard.tsx — REDESIGNED
 *
 * Key fixes:
 * 1. Cast `user` to `BossProfile` for type-safe field access
 * 2. All boss-specific fields (companyName, companyRegistrationNumber, etc.) properly typed
 * 3. Safe fallbacks for optional fields
 */

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { TrendingUp, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ProfileCompletionBanner } from '@/components/ui/ProfileCompletionBanner';
import { Building2, MapPin, Star, Users, Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BossProfile } from '@/types/user.types';

export default function BossDashboard() {
  const { user, isLoading } = useUser();

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  // Safe cast — this page only renders for Bosses (guaranteed by middleware + routing)
  const boss = user as BossProfile;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <ProfileCompletionBanner />

        {/* Verification Banner */}
        {boss.companyLicenseStatus !== 'VALID' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Company Verification Required</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                {!boss.companyLicenseDocument
                  ? 'Please upload your company license document in your profile to get verified. You won\u2019t be able to search for guards or hire them until your documents are reviewed by an admin.'
                  : 'Your company documents are pending admin review. You won\u2019t be able to search for guards or hire them until verified.'}
              </p>
              {!boss.companyLicenseDocument && (
                <a href="/dashboard/boss/profile" className="inline-block mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
                  Go to Profile →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Business Overview
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Managing {boss.companyName ?? 'your business'} on GuardMate.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/dashboard/boss/profile">
              <Button variant="outline" size="md" className="text-sm px-4 py-1">
                Edit Profile
              </Button>
            </Link>
            <Button size="md" className=" text-sm px-4 py-1" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Post Job
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<FileText className="h-4 w-4 text-blue-500" />}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            label="Open Vacancies"
            value={String(boss.activeJobsCount ?? 0)}
            trend={`${boss.totalJobsPosted ?? 0} total posted`}
          />
          <StatCard
            icon={<Users className="h-4 w-4 text-emerald-500" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            label="Jobs Completed"
            value={String(boss.completedJobsCount ?? 0)}
            trend={`${boss.cancelledJobsCount ?? 0} cancelled`}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
            iconBg="bg-violet-50 dark:bg-violet-950/40"
            label="Total Spend"
            value={boss.totalSpent ? `£${boss.totalSpent.toLocaleString()}` : '£0'}
            trend="All time"
          />
          <StatCard
            icon={<Building2 className="h-4 w-4 text-amber-500" />}
            iconBg="bg-amber-50 dark:bg-amber-950/40"
            label="Account Status"
            value={boss.status === 'ACTIVE' ? 'Active' : 'Pending'}
            trend={boss.status === 'ACTIVE' ? 'Approved by Admin' : 'Awaiting approval'}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Company Profile Card */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden h-fit">

              {/* Card header strip */}
              <div className="px-4 py-2.5 border-b border-[var(--color-border-primary)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-[var(--color-text-secondary)]">
                    Company Profile
                  </span>
                </div>
                <Link
                  href="/dashboard/boss/profile"
                  className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex items-center gap-0.5 transition-colors"
                >
                  Edit <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Avatar block */}
              <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-[var(--color-border-primary)]">
                <Avatar
                  src={boss.profilePhoto ?? undefined}
                  name={boss.companyName ?? `${boss.firstName} ${boss.lastName}`}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate leading-snug">
                    {boss.companyName ?? `${boss.firstName} ${boss.lastName}`}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-[var(--color-text-tertiary)] flex-shrink-0" />
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">
                      {boss.companyCity ?? boss.city ?? 'Not set'}
                      {(boss.companyCountry ?? boss.country) ? `, ${boss.companyCountry ?? boss.country}` : ''}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Badge
                      variant={boss.status === 'ACTIVE' ? 'success' : boss.status === 'SUSPENDED' ? 'danger' : 'warning'}
                      size="sm"
                      className="py-0 text-[10px] leading-none h-4"
                    >
                      {boss.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div className="divide-y divide-[var(--color-border-primary)]">
                <ProfileRow
                  label="Reg. Number"
                  value={boss.companyRegistrationNumber ?? 'Not set'}
                />
                <ProfileRow
                  label="Email"
                  value={boss.companyEmail ?? boss.email ?? '—'}
                />
                {boss.averageRating && (
                  <ProfileRow
                    label="Rating"
                    value={`${boss.averageRating.toFixed(1)} ★`}
                    valueClassName="text-amber-500 font-semibold"
                  />
                )}
                {boss.industry && (
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5">
                      Industry
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-secondary)]">
                        {boss.industry}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Dashboard Placeholder */}
          <Card className="lg:col-span-2 flex flex-col items-center justify-center text-center p-8 border-dashed border-2 min-h-[320px] space-y-4">
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Your Business Dashboard is Ready
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The full Boss platform is launching soon. Streamline security procurement
                with automated scheduling, verified background checks, and seamless payments.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatCard({
  icon,
  iconBg,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <Card className=" hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2.5">
        <div className={`p-1.5 rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-0.5">
        {label}
      </p>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] capitalize leading-tight">
        {value}
      </h2>
      <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 leading-snug">{trend}</p>
    </Card>
  );
}

function ProfileRow({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)] flex-shrink-0">
        {label}
      </span>
      <span className={`text-xs text-right truncate text-[var(--color-text-primary)] ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}