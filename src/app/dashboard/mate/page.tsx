'use client';

/**
 * MateDashboard.tsx — REDESIGNED
 *
 * Key fixes:
 * 1. Cast `user` to `MateProfile` for type-safe field access
 * 2. fullName virtual handled safely with fallback
 * 3. All mate-specific fields (licenseNumber, hourlyRate, etc.) properly typed
 */

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ProfileCompletionBanner } from '@/components/ui/ProfileCompletionBanner';
import { Shield, MapPin, Star, Briefcase, ChevronRight, Activity, AlertTriangle } from 'lucide-react';
import type { MateProfile } from '@/types/user.types';

export default function MateDashboard() {
  const { user, isLoading } = useUser();

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  // Safe cast — this page only renders for Mates (guaranteed by middleware + routing)
  const mate = user as MateProfile;

  const displayName = `${mate.firstName} ${mate.lastName}`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <ProfileCompletionBanner />

        {/* Verification Banner */}
        {mate.licenseStatus !== 'VALID' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Verification Required</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                {!mate.licenseDocument
                  ? 'Please upload your SIA license document and ID in your profile to get verified. You won\u2019t be able to find or apply for jobs until your documents are reviewed by an admin.'
                  : 'Your documents are pending admin review. You won\u2019t be able to find or apply for jobs until verified.'}
              </p>
              {!mate.licenseDocument && (
                <a href="/dashboard/mate/profile" className="inline-block mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
                  Go to Profile →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Briefcase className="h-4 w-4 text-blue-500" />}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            label="Active Jobs"
            value={String(mate.totalJobsCompleted ?? 0)}
            trend="+1 from last week"
          />
          <StatCard
            icon={<Star className="h-4 w-4 text-amber-500" />}
            iconBg="bg-amber-50 dark:bg-amber-950/40"
            label="Rating"
            value={mate.averageRating ? mate.averageRating.toFixed(1) : 'N/A'}
            trend={mate.totalReviews ? `${mate.totalReviews} reviews` : 'No reviews yet'}
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-violet-500" />}
            iconBg="bg-violet-50 dark:bg-violet-950/40"
            label="Completion"
            value={mate.completionRate ? `${mate.completionRate}%` : 'N/A'}
            trend="This month"
          />
          <StatCard
            icon={<Shield className="h-4 w-4 text-emerald-500" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            label="Account Status"
            value={mate.status === 'ACTIVE' ? 'Active' : 'Pending'}
            trend={mate.status === 'ACTIVE' ? 'Approved by Admin' : 'Awaiting approval'}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Profile Info Card — redesigned */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden h-fit">
              {/* Card header strip */}
              <div className="px-4 py-3 border-b border-[var(--color-border-primary)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold tracking-wide uppercase text-[var(--color-text-secondary)]">
                    Profile Info
                  </span>
                </div>
                <Link
                  href="/dashboard/mate/profile"
                  className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex items-center gap-0.5 transition-colors"
                >
                  Edit <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Avatar block */}
              <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-[var(--color-border-primary)]">
                <Avatar
                  src={mate.profilePhoto ?? undefined}
                  name={displayName}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate leading-snug">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-[var(--color-text-tertiary)] flex-shrink-0" />
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">
                      {mate.city ?? 'London'}, {mate.country ?? 'UK'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant={mate.isAvailable ? 'success' : 'neutral'} size="sm" className="py-0 text-[10px] leading-none h-4">
                      {mate.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                    <Badge variant={mate.status === 'ACTIVE' ? 'success' : mate.status === 'SUSPENDED' ? 'danger' : 'warning'} size="sm" className="py-0 text-[10px] leading-none h-4">
                      {mate.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div className="divide-y divide-[var(--color-border-primary)]">
                <ProfileRow
                  label="SIA License"
                  value={mate.licenseNumber ?? 'Not provided'}
                />
                <ProfileRow
                  label="Hourly Rate"
                  value={mate.hourlyRate ? `£${mate.hourlyRate}/hr` : 'Not set'}
                  valueClassName="text-emerald-500 font-semibold"
                />
                <div className="px-4 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5">
                    Skills
                  </p>
                  {mate.skills?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {mate.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-secondary)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-tertiary)]">No skills added</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Dashboard Placeholder */}
          <Card className="lg:col-span-2 flex flex-col items-center justify-center text-center p-8 border-dashed border-2 min-h-[320px] space-y-4">
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Your Dashboard is Ready
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                We&apos;re building the full Mate experience. Soon you&apos;ll manage
                applications, view earnings, and chat with clients directly from here.
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
      <span
        className={`text-xs text-right truncate text-[var(--color-text-primary)] ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}