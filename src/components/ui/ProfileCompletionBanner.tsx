'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserRole } from '@/types/enums';

export function ProfileCompletionBanner() {
  const { user, isProfileComplete } = useUser();
  const [isDismissed, setIsDismissed] = useState(false);

  // If loading, no user, already complete, or dismissed, do not render
  if (!user || isProfileComplete || isDismissed) return null;

  // Define required fields by role
  const mateRequired = [
    'firstName', 'lastName', 'phone', 'country', 'city', 'bio',
    'licenseNumber', 'licenseType', 'licenseIssuingAuthority',
    'licenseExpiry', 'licenseDocument', 'skills', 'hourlyRate',
    'experience', 'languages', 'availabilityCalendar', 'preferredWorkRadius',
    'idType', 'idNumber', 'idDocument', 'backgroundCheckDocument',
    'firstAidCertificate'
  ];

  const bossRequired = [
    'firstName', 'lastName', 'phone', 'country', 'city', 'bio',
    'companyName', 'companyRegistrationNumber', 'companyLicenseNumber',
    'companyLicenseExpiry', 'companyLicenseDocument', 'companyAddress',
    'companyCity', 'companyState', 'companyCountry', 'companyPostalCode', 
    'companyPhone', 'companyEmail', 'companyWebsite', 'companyDescription', 'industry'
  ];

  const requiredFields = user.role === UserRole.BOSS ? bossRequired : mateRequired;
  
  // Calculate completion percentage safely safely checking undefined, null, or empty string/array
  const filledFields = requiredFields.filter((field) => {
    const val = (user as any)[field];
    if (Array.isArray(val)) return val.length > 0;
    return val !== undefined && val !== null && String(val).trim() !== '';
  });

  const completionPercentage = Math.round((filledFields.length / requiredFields.length) * 100);
  
  // If it calculates to 100% but the server flag is still false, show 99% until they hit save
  const displayPercentage = completionPercentage === 100 ? 99 : completionPercentage;

  const profilePath = user.role === UserRole.BOSS ? '/dashboard/boss/profile' : '/dashboard/mate/profile';

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl bg-[var(--color-warning-light)] border border-[var(--color-warning)]/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between transition-all animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start sm:items-center gap-3 w-full">
        <div className="bg-[var(--color-warning)]/10 p-2 rounded-full shrink-0">
          <AlertCircle className="h-6 w-6 text-[var(--color-warning)]" />
        </div>
        
        <div className="flex-1 space-y-2 w-full pr-6 sm:pr-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-warning-dark)]">
              Complete Your Profile
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-warning-dark)]/80 mt-0.5">
              Your profile is only {displayPercentage}% complete. A complete profile helps you stand out and get approved faster.
            </p>
          </div>
          
          {/* Progress Bar Container */}
          <div className="w-full max-w-md bg-[var(--color-warning)]/20 rounded-full h-2.5 overflow-hidden flex">
            <div 
              className="bg-[var(--color-warning)] h-2.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${displayPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
        <Link 
          href={profilePath}
          className="text-xs sm:text-sm font-bold bg-[var(--color-warning)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-warning-dark)] transition-colors text-center whitespace-nowrap"
        >
          Complete Now
        </Link>
        <button 
          onClick={() => setIsDismissed(true)}
          className="p-1 text-[var(--color-warning)]/60 hover:text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10 rounded-full transition-colors absolute top-2 right-2 sm:static"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
