'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { Card } from '@/components/ui/Card';
import type { IGuardPublicProfile } from '@/types/user.types';
import {
  Briefcase, CheckCircle2, Clock, Shield,
  TrendingUp, DollarSign, MessageSquare,
  Globe, AlertCircle
} from 'lucide-react';

interface GuardProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: IGuardPublicProfile | null;
  loading?: boolean;
  onMessage?: () => void;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-[var(--color-bg-subtle)] rounded-xl p-3 flex flex-col items-center text-center">
      <span className="text-[var(--color-primary)] mb-1">{icon}</span>
      <span className="text-sm font-black text-[var(--color-text-primary)]">{value}</span>
      <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</span>
    </div>
  );
}

function VerificationBadge({ label, verified }: { label: string; verified: boolean }) {
  return (
    <Badge
      variant={verified ? 'success' : 'neutral'}
      size="sm"
      className="text-[10px]"
    >
      {verified ? <CheckCircle2 className="h-3 w-3 mr-0.5" /> : <Shield className="h-3 w-3 mr-0.5" />}
      {label}
    </Badge>
  );
}

export function GuardProfileModal({
  isOpen,
  onClose,
  profile,
  loading = false,
  onMessage,
}: GuardProfileModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      ) : !profile ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-[var(--color-danger)] mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Failed to load profile</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">Please try again later.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar src={profile.profilePhoto ?? undefined} name={profile.fullName} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-[var(--color-text-primary)] truncate">
                {profile.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={profile.averageRating} size="sm" />
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                  {profile.averageRating.toFixed(1)} ({profile.totalReviews} reviews)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={profile.averageRating >= 4.5 ? 'success' : profile.averageRating >= 3.5 ? 'warning' : 'neutral'}
                  size="sm"
                  className="text-[10px]"
                >
                  {profile.totalJobsCompleted} jobs completed
                </Badge>
                {profile.experience ? (
                  <Badge variant="neutral" size="sm" className="text-[10px]">
                    {profile.experience} years exp
                  </Badge>
                ) : null}
              </div>
            </div>
            {onMessage && (
              <Button
                size="sm"
                variant="outline"
                onClick={onMessage}
                leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                className="shrink-0"
              >
                Message
              </Button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatCard icon={<Briefcase className="h-4 w-4" />} label="Completed" value={profile.totalJobsCompleted} />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completion" value={`${Math.round(profile.completionRate)}%`} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="On Time" value={`${Math.round(profile.onTimeRate)}%`} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Reliability" value={`${Math.round(profile.reliabilityScore)}%`} />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Earnings" value={`$${(profile.totalEarnings || 0).toLocaleString()}`} />
          </div>

          {/* Bio */}
          {profile.bio && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">About</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-subtle)] rounded-xl p-4">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Skills */}
          {profile.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="neutral" size="sm" className="text-[10px]">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {profile.languages.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Languages</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((lang) => (
                  <Badge key={lang} variant="info" size="sm" className="text-[10px]" icon={<Globe className="h-3 w-3" />}>
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Verification Badges */}
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Verifications</h3>
            <div className="flex flex-wrap gap-1.5">
              <VerificationBadge label="License" verified={profile.licenseStatus === 'VALID'} />
              <VerificationBadge label="ID Check" verified={profile.idVerificationStatus === 'VERIFIED'} />
              <VerificationBadge label="Background" verified={profile.backgroundCheckStatus === 'VERIFIED'} />
              <VerificationBadge label="First Aid" verified={!!profile.firstAidCertificateStatus && profile.firstAidCertificateStatus !== 'UNVERIFIED'} />
              <VerificationBadge label="White Card" verified={!!profile.constructionWhiteCardStatus && profile.constructionWhiteCardStatus !== 'UNVERIFIED'} />
              <VerificationBadge label="WWC" verified={!!profile.workingWithChildrenCheckStatus && profile.workingWithChildrenCheckStatus !== 'UNVERIFIED'} />
              <VerificationBadge label="ABN" verified={profile.abnVerified} />
            </div>
          </div>

          {/* Work History */}
          {profile.workHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Work History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {profile.workHistory.map((item) => (
                  <Card key={item.jobId} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.jobTitle}</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">{item.bossName}</p>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                      {item.completedAt ? new Date(item.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {profile.reviews.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                Reviews ({profile.reviews.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {profile.reviews.map((review, idx) => (
                  <Card key={idx} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">{review.reviewerName}</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] italic">{review.jobName}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{review.comment}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
