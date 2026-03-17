'use client';

import React from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import type { MateProfile } from '@/types/user.types';
import { LicenseStatus, VerificationStatus, CertificateStatus } from '@/types/enums';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function FirstAidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8a2 2 0 0 1 2 2v2H6V4a2 2 0 0 1 2-2z" />
      <rect x="3" y="6" width="18" height="16" rx="2" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </svg>
  );
}

function HardHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
      <path d="M10 15V7a2 2 0 0 1 4 0v8" />
      <path d="M5 15v-3a7 7 0 0 1 14 0v3" />
    </svg>
  );
}

function ChildrenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v4" />
      <path d="M8 10h8" />
      <path d="M10 10l-2 8" />
      <path d="M14 10l2 8" />
      <circle cx="7" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="m9 12-3 4" />
      <path d="m15 12 3 4" />
    </svg>
  );
}

function IdCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M5 16c0-1.7 1.3-3 3-3s3 1.3 3 3" />
      <line x1="14" y1="9" x2="19" y2="9" />
      <line x1="14" y1="13" x2="19" y2="13" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertificateBadgeConfig {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  show: boolean;
  status: 'valid' | 'pending' | 'rejected' | 'none';
}

interface CertificateBadgesProps {
  user: MateProfile;
  size?: 'sm' | 'md';
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

function getCertStatus(
  certStatus: CertificateStatus | LicenseStatus | VerificationStatus | null | undefined,
  documentUrl: string | null | undefined
): 'valid' | 'pending' | 'rejected' | 'none' {
  if (!certStatus && !documentUrl) return 'none';
  if (!certStatus) return 'none';

  const validStatuses = [CertificateStatus.VALID, LicenseStatus.VALID, VerificationStatus.VERIFIED];
  const pendingStatuses = [CertificateStatus.PENDING_REVIEW, LicenseStatus.PENDING_REVIEW, VerificationStatus.PENDING];
  const rejectedStatuses = [CertificateStatus.REJECTED, CertificateStatus.EXPIRED, LicenseStatus.EXPIRED, VerificationStatus.REJECTED];

  if (validStatuses.includes(certStatus as CertificateStatus)) return 'valid';
  if (pendingStatuses.includes(certStatus as CertificateStatus)) return 'pending';
  if (rejectedStatuses.includes(certStatus as CertificateStatus)) return 'rejected';
  return 'none';
}

function getStatusLabel(status: 'valid' | 'pending' | 'rejected' | 'none'): string {
  switch (status) {
    case 'valid': return 'Verified';
    case 'pending': return 'Pending Review';
    case 'rejected': return 'Rejected / Expired';
    case 'none': return 'Not Uploaded';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificateBadges({ user, size = 'md' }: CertificateBadgesProps) {
  const badges: CertificateBadgeConfig[] = [
    {
      id: 'sia-license',
      label: 'SIA License',
      icon: ShieldIcon,
      show: true,
      status: getCertStatus(user.licenseStatus, user.licenseDocument),
    },
    {
      id: 'first-aid',
      label: 'First Aid Certificate',
      icon: FirstAidIcon,
      show: !!user.firstAidCertificate,
      status: getCertStatus(user.firstAidCertificateStatus, user.firstAidCertificate),
    },
    {
      id: 'white-card',
      label: 'Construction White Card',
      icon: HardHatIcon,
      show: !!user.worksOnConstructionSite,
      status: getCertStatus(user.constructionWhiteCardStatus, user.constructionWhiteCard),
    },
    {
      id: 'children-check',
      label: 'Working With Children Check',
      icon: ChildrenIcon,
      show: !!user.worksWithChildren,
      status: getCertStatus(user.workingWithChildrenCheckStatus, user.workingWithChildrenCheck),
    },
    {
      id: 'id-verified',
      label: 'Identity Verified',
      icon: IdCardIcon,
      show: true,
      status: getCertStatus(user.idVerificationStatus, user.idDocument),
    },
  ];

  const visibleBadges = badges.filter((b) => b.show);

  const sizeClasses = size === 'sm'
    ? { wrapper: 'h-6 w-6', icon: 'h-3 w-3' }
    : { wrapper: 'h-8 w-8', icon: 'h-4 w-4' };

  const statusColors: Record<string, string> = {
    valid:    'bg-[var(--color-success)] text-white shadow-[0_0_8px_var(--color-success)]',
    pending:  'bg-[var(--color-warning)] text-white shadow-[0_0_8px_var(--color-warning)]',
    rejected: 'bg-[var(--color-danger)] text-white shadow-[0_0_8px_var(--color-danger)]',
    none:     'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]',
  };

  if (visibleBadges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleBadges.map((badge) => (
        <Tooltip
          key={badge.id}
          content={`${badge.label}: ${getStatusLabel(badge.status)}`}
          position="bottom"
        >
          <div
            className={`${sizeClasses.wrapper} rounded-full flex items-center justify-center transition-all duration-200 cursor-default ${statusColors[badge.status]}`}
          >
            <badge.icon className={sizeClasses.icon} />
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
