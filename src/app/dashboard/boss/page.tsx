'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { 
  TrendingUp, FileText, ChevronRight, AlertTriangle, 
  Building2, MapPin, Star, Users, Briefcase, Plus, AlertCircle,
  CheckCircle2, Clock, Calendar, Search, ArrowUpRight, MoreHorizontal, Shield, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ProfileCompletionBanner } from '@/components/ui/ProfileCompletionBanner';
import { StatCard } from '@/components/ui/StatCard';
import { StarRating } from '@/components/ui/StarRating';
import { getBossActivity } from '@/lib/api/job.api';
import { getMyPendingReviews } from '@/lib/api/review.api';
import type { BossActivityItem } from '@/lib/api/job.api';
import type { BossProfile } from '@/types/user.types';
import { VerificationStatus, LicenseStatus } from '@/types/enums';

export default function BossDashboard() {
  const { user, isLoading } = useUser();
  const [activity, setActivity] = useState<BossActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [hideReviewBanner, setHideReviewBanner] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const [resp, pendingResp] = await Promise.all([
          getBossActivity(),
          getMyPendingReviews()
        ]);
        if (resp.success && resp.data) setActivity(resp.data);
        if (pendingResp.success && pendingResp.data) setPendingCount(pendingResp.data.length);
      } catch { /* silent */ }
      finally { setActivityLoading(false); }
    };
    fetchActivity();
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  const boss = user as BossProfile;
  const isVerified = boss.isCompanyVerified && boss.companyLicenseStatus === LicenseStatus.VALID;

  const jobStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'success';
      case 'FILLED': case 'IN_PROGRESS': return 'info';
      case 'COMPLETED': return 'neutral';
      case 'CANCELLED': case 'EXPIRED': return 'danger';
      case 'DRAFT': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        <ProfileCompletionBanner />

        {pendingCount > 0 && !hideReviewBanner && (
          <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary-dark)] px-4 py-3 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-full">
                <Star className="h-5 w-5 text-[var(--color-primary)]" fill="var(--color-primary)" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Action Required: Rate your Mates</h3>
                <p className="text-xs font-medium opacity-90 mt-0.5">
                  You have {pendingCount} completed job{pendingCount !== 1 ? 's' : ''} awaiting your review. Reviews help build trust on the platform.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/boss/jobs?status=COMPLETED">
                <Button size="sm" variant="primary">Leave Reviews</Button>
              </Link>
              <button 
                onClick={() => setHideReviewBanner(true)}
                className="p-1.5 hover:bg-[var(--color-primary)]/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Welcome & Action Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">
              Manage your company {boss.companyName ? `at ${boss.companyName}` : ''} • {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/boss/profile">
              <Button variant="ghost" size="sm" className="font-bold border border-[var(--color-border-primary)]">
                View Profile
              </Button>
            </Link>
            <Link href={isVerified ? "/dashboard/boss/jobs/new" : "#"}>
              <Button 
                disabled={!isVerified} 
                size="sm"
                className="shadow-md shadow-[var(--color-primary)]/10 px-5"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Post Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Stats Row — Compact 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Company Status Card */}
          <Card className={`p-4 flex items-center justify-between ${!isVerified ? 'border-[var(--color-warning)] bg-[var(--color-warning-light)]/20' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isVerified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-[var(--color-warning-dark)]'}`}>
                {isVerified ? <CheckCircle2 className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-0.5">Company Status</p>
                <h3 className={`text-sm font-black ${isVerified ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-warning-dark)]'}`}>
                  {isVerified ? "VERIFIED" : "ACTION REQUIRED"}
                </h3>
              </div>
            </div>
          </Card>

          {/* Key Performance Stats */}
          <StatCard 
            label="Active Jobs" 
            value={boss.activeJobsCount || 0} 
            icon={<Briefcase />} 
            variant="blue"
            className="shadow-sm"
          />
          <StatCard 
            label="Total Spent" 
            value={`£${(boss.totalSpent || 0).toLocaleString()}`} 
            icon={<TrendingUp />} 
            variant="emerald"
            className="md:col-span-2 lg:col-span-1 shadow-sm"
          />
        </div>

        {/* Verification & Warnings Row */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] shadow-sm overflow-hidden relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
               <div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <Badge variant={boss.isCompanyVerified ? 'success' : 'warning'} className="text-[10px] font-bold py-0 h-5">
                      {boss.isCompanyVerified ? 'BUSINESS VERIFIED' : 'BUSINESS PENDING'}
                    </Badge>
                    <Badge variant={boss.companyLicenseStatus === LicenseStatus.VALID ? 'success' : 'warning'} className="text-[10px] font-bold py-0 h-5">
                      LICENSE: {boss.companyLicenseStatus === LicenseStatus.VALID ? 'VALID' : 'REQUIRED'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-1.5">
                    {isVerified 
                      ? "Your account is fully verified. You have full access to hiring Mates."
                      : "Verification pending review. Please ensure your business documents are current."}
                  </p>
               </div>
            </div>
            <Building2 className="hidden sm:block opacity-[0.03] absolute right-4 top-1/2 -translate-y-1/2 h-20 w-20" />
          </Card>

          {(boss.cancellationStrikes || 0) > 0 && (
            <div className="bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 text-[var(--color-danger-dark)] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p>You have {boss.cancellationStrikes} cancellation strike{(boss.cancellationStrikes || 0) > 1 ? 's' : ''} recorded.</p>
                <p className="text-[10px] font-medium opacity-80 mt-0.5">Frequent cancellations negatively affect your employer reputation.</p>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Insight Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Recent Jobs Table Card — Real Data */}
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border-primary)] flex items-center justify-between">
              <h3 className="font-bold text-sm">Recent Activity</h3>
              <Link href="/dashboard/boss/jobs" className="text-[10px] font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] flex items-center gap-0.5 transition-colors">
                VIEW ALL <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--color-bg-secondary)]/50 text-[var(--color-text-tertiary)] uppercase text-[9px] font-bold tracking-widest">
                  <tr>
                    <th className="px-5 py-3">Position</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Applicants</th>
                    <th className="px-5 py-3">Budget</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-primary)]">
                  {activityLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                          <div className="h-3 w-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                          Loading activity...
                        </div>
                      </td>
                    </tr>
                  ) : activity.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Briefcase className="h-6 w-6 text-[var(--color-text-muted)] opacity-40" />
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">No jobs posted yet. Create your first listing!</p>
                          {isVerified && (
                            <Link href="/dashboard/boss/jobs/new">
                              <Button size="sm" variant="ghost" className="text-[10px] border border-[var(--color-border-primary)] mt-1">
                                Post a Job
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activity.map((item) => (
                      <tr key={item.jobId} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <Link href={`/dashboard/boss/jobs/${item.jobId}`} className="font-bold text-xs hover:text-[var(--color-primary)] transition-colors">{item.title}</Link>
                            <span className="text-[9px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                              <MapPin className="h-2 w-2" /> {item.locationCity}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge variant={jobStatusVariant(item.status)} className="text-[9px] h-4">{item.status}</Badge>
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-medium">{item.totalBids}</td>
                        <td className="px-5 py-3 text-xs font-bold whitespace-nowrap">
                          £{item.budgetAmount}{item.budgetType === 'HOURLY' ? '/hr' : ''}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/dashboard/boss/jobs/${item.jobId}`}>
                            <button className="p-1.5 hover:bg-[var(--color-bg-tertiary)] rounded-full transition-colors">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Ratings & Activity Column */}
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Employer Status</h3>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex flex-col items-center justify-center py-2">
                <span className="text-4xl font-black text-[var(--color-text-primary)]">
                  {boss.averageRating ? boss.averageRating.toFixed(1) : '—'}
                </span>
                <div className="mt-1">
                  <StarRating rating={boss.averageRating || 0} size="md" />
                </div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 font-bold uppercase tracking-wider">
                  {boss.completedJobsCount || 0} Completions
                </p>
              </div>
              <div className="mt-4 space-y-2.5 pt-4 border-t border-[var(--color-border-primary)]">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[var(--color-text-tertiary)] uppercase">Reliability</span>
                  <span className="text-emerald-500 text-[11px]">95%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '95%' }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold mt-1">
                  <span className="text-[var(--color-text-tertiary)] uppercase">Communication</span>
                  <span className="text-blue-500 text-[11px]">88%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '88%' }} />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 text-white border-none relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="font-bold text-sm mb-1">Support</h3>
                <p className="text-[10px] opacity-80 leading-relaxed mb-4">
                  Available 24/7 for you.
                </p>
                <Button variant="secondary" size="sm" className="w-full bg-white text-black hover:bg-white/90 font-bold h-9">
                  Get Help
                </Button>
              </div>
              <AlertCircle className="absolute -right-4 -bottom-4 h-20 w-20 opacity-10" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}