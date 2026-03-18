'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { 
  Shield, MapPin, Star, Briefcase, ChevronRight, Activity, 
  AlertTriangle, DollarSign, Clock, Calendar, CheckCircle2,
  TrendingUp, Award, MoreHorizontal, Send, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ProfileCompletionBanner } from '@/components/ui/ProfileCompletionBanner';
import { StatCard } from '@/components/ui/StatCard';
import { CertificateBadges } from '@/components/ui/CertificateBadges';
import { StarRating } from '@/components/ui/StarRating';
import { updateUserProfile } from '@/lib/api/user.api';
import { getMateActivity } from '@/lib/api/job.api';
import { getMyPendingReviews } from '@/lib/api/review.api';
import type { MateActivityItem } from '@/lib/api/job.api';
import type { MateProfile } from '@/types/user.types';
import { VerificationStatus, LicenseStatus } from '@/types/enums';
import toast from 'react-hot-toast';

export default function MateDashboard() {
  const { user, isLoading, fetchUser } = useUser();
  const [activity, setActivity] = useState<MateActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [hideReviewBanner, setHideReviewBanner] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const [resp, pendingResp] = await Promise.all([
          getMateActivity(),
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

  const mate = user as MateProfile;
  const isVerified = mate.licenseStatus === LicenseStatus.VALID && mate.idVerificationStatus === VerificationStatus.VERIFIED;

  const handleAvailabilityToggle = async (checked: boolean) => {
    try {
      await updateUserProfile({ isAvailable: checked });
      await fetchUser();
      toast.success(checked ? "You're now visible for jobs!" : "Availability turned off.");
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  const bidStatusVariant = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'REJECTED': return 'danger';
      case 'WITHDRAWN': case 'EXPIRED': return 'neutral';
      default: return 'warning';
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
                <h3 className="text-sm font-bold">Action Required: Rate your Bosses</h3>
                <p className="text-xs font-medium opacity-90 mt-0.5">
                  You have {pendingCount} completed job{pendingCount !== 1 ? 's' : ''} awaiting your review. Reviews help build trust on the platform.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/mate/bids?status=ACCEPTED">
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

        {/* Welcome & Earnings Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              Mate Dashboard
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">
              Available for work • {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/dashboard/mate/profile">
              <Button variant="ghost" size="sm" className="font-bold border border-[var(--color-border-primary)]">
                View Profile
              </Button>
            </Link>
            <div className="flex items-center gap-3 bg-[var(--color-bg-secondary)] py-1 pl-1 pr-3 rounded-full border border-[var(--color-border-primary)]">
               <div className="p-1.5 bg-emerald-500/10 rounded-full text-emerald-500">
                 <DollarSign className="h-4 w-4" />
               </div>
               <span className="text-xs font-black">£{(mate.totalEarnings || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Primary Controls & Status — Fixed equal-height layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5" style={{ alignItems: 'stretch' }}>
          
          {/* Availability & Verification Card */}
          <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-base">Duty Status</h3>
                </div>
                <Toggle 
                  checked={mate.isAvailable} 
                  onCheckedChange={handleAvailabilityToggle}
                  label={mate.isAvailable ? "ON DUTY" : "OFF DUTY"}
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">VERIFICATION</span>
                  <Badge variant={isVerified ? 'success' : 'warning'} className="text-[9px] h-4 py-0">
                    {isVerified ? 'VERIFIED' : 'PENDING'}
                  </Badge>
                </div>
                <div className="hidden xl:block mb-3">
                  <CertificateBadges user={mate} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <StatusMini label="SIA License" active={mate.licenseStatus === LicenseStatus.VALID} />
                  <StatusMini label="Identity ID" active={mate.idVerificationStatus === VerificationStatus.VERIFIED} />
                  <StatusMini label="BG Check" active={mate.backgroundCheckStatus === VerificationStatus.VERIFIED} />
                  <StatusMini label="Certifications" active={!!mate.certifications?.length} />
                </div>
              </div>
            </div>
          </Card>

          {/* Key Performance Stats — matches height of left card */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 auto-rows-fr">
            <StatCard 
              label="Jobs Completed" 
              value={mate.totalJobsCompleted || 0} 
              icon={<Shield />} 
              variant="blue"
            />
            <StatCard 
              label="Reliability Score" 
              value={`${mate.reliabilityScore ?? 100}%`} 
              icon={<Award />} 
              variant="amber"
            />
            {(mate.cancellationStrikes || 0) > 0 && (
              <div className="col-span-2 bg-[var(--color-warning-light)] text-[var(--color-warning)] px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                You have {mate.cancellationStrikes} cancellation strike{(mate.cancellationStrikes || 0) > 1 ? 's' : ''} — this may impact future job opportunities.
              </div>
            )}
          </div>
        </div>

        {/* Activity & Reputation Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Activity History Card — Real Data */}
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border-primary)] flex items-center justify-between">
              <h3 className="font-bold text-sm">Recent Activity</h3>
              <Link href="/dashboard/mate/bids" className="text-[10px] font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] flex items-center gap-0.5 transition-colors">
                FULL LOG <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--color-bg-secondary)]/50 text-[var(--color-text-tertiary)] uppercase text-[9px] font-bold tracking-widest">
                  <tr>
                    <th className="px-5 py-3">Job</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Proposed</th>
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
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">No activity yet. Start applying for jobs!</p>
                          <Link href="/dashboard/mate/jobs">
                            <Button size="sm" variant="ghost" className="text-[10px] border border-[var(--color-border-primary)] mt-1">
                              Browse Jobs
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activity.map((item) => (
                      <tr key={item.bidId} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <Link href={`/dashboard/mate/jobs/${item.jobId}`} className="font-bold text-xs hover:text-[var(--color-primary)] transition-colors">{item.jobTitle}</Link>
                            <span className="text-[9px] text-[var(--color-text-tertiary)]">{item.companyName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs font-medium whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={bidStatusVariant(item.bidStatus)} className="text-[9px] h-4 py-0">{item.bidStatus}</Badge>
                        </td>
                        <td className="px-5 py-3 text-xs font-bold text-emerald-500 whitespace-nowrap">
                          £{item.totalProposed}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/dashboard/mate/jobs/${item.jobId}`}>
                            <button className="p-1.5 hover:bg-[var(--color-bg-tertiary)] rounded-full transition-colors"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Reputation Card */}
          <div className="space-y-5">
             <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Mate Reputation</h3>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex flex-col items-center justify-center py-2">
                <span className="text-4xl font-black">
                  {mate.averageRating ? mate.averageRating.toFixed(1) : '—'}
                </span>
                <div className="mt-1">
                  <StarRating rating={mate.averageRating || 0} size="md" />
                </div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 font-bold uppercase tracking-wider">
                  {mate.totalReviews || 0} Reviews
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)] flex justify-around">
                <Link href="/dashboard/mate/reviews" className="flex flex-col items-center group">
                  <div className="p-2.5 rounded-full bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-primary-light)] transition-colors">
                    <Star className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]" />
                  </div>
                  <span className="text-[9px] font-bold mt-1.5 uppercase opacity-70">Reviews</span>
                </Link>
                <Link href="/dashboard/mate/profile" className="flex flex-col items-center group">
                  <div className="p-2.5 rounded-full bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-primary-light)] transition-colors">
                    <Activity className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]" />
                  </div>
                  <span className="text-[9px] font-bold mt-1.5 uppercase opacity-70">Profile</span>
                </Link>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">My Bids</h3>
                <Send className="h-4 w-4 text-[var(--color-primary)]" />
              </div>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mb-3">Track your job applications and bid statuses.</p>
              <Link href="/dashboard/mate/bids">
                <Button variant="ghost" size="sm" className="w-full border border-[var(--color-border-primary)] font-bold">View My Bids</Button>
              </Link>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none relative overflow-hidden group cursor-pointer shadow-lg shadow-indigo-600/20">
              <div className="relative z-10">
                <h3 className="font-bold text-base mb-1 text-white">Find Work</h3>
                <p className="text-[10px] text-white/80 leading-relaxed mb-4">
                  Browse the latest security job openings.
                </p>
                <Link href="/dashboard/mate/jobs">
                  <Button size="sm" className="bg-white text-indigo-700 hover:bg-slate-50 font-bold px-6 shadow-sm">Browse Jobs</Button>
                </Link>
              </div>
              <Briefcase className="absolute -bottom-4 -right-4 h-20 w-20 text-white opacity-10 group-hover:scale-110 transition-transform duration-300" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusMini({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--color-border-primary)]'}`} />
      <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase text-nowrap">{label}</span>
    </div>
  );
}