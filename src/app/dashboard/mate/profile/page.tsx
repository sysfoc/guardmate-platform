'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { usePlatformContext } from '@/context/PlatformContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Toggle } from '@/components/ui/Toggle';
import { updateUserProfile, uploadProfilePhoto, uploadDocument } from '@/lib/api/user.api';
import type { MateProfile } from '@/types/user.types';
import toast from 'react-hot-toast';
import {
  Camera, Save, ArrowLeft, Loader2, Upload, FileText, AlertCircle,
  User, Shield, Briefcase, MapPin, Phone, Mail, Star, Clock,
} from 'lucide-react';
export default function MateProfileEdit() {
  const router = useRouter();
  const { user, fetchUser } = useUser();
  const { platformCountry } = usePlatformContext();

  const mate = user as MateProfile | null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [localLicenseDoc, setLocalLicenseDoc] = useState<string | undefined>(undefined);
  const [localIdDoc, setLocalIdDoc] = useState<string | undefined>(undefined);
  const [localLicenseStatus, setLocalLicenseStatus] = useState<string | undefined>(undefined);
  const [localIdStatus, setLocalIdStatus] = useState<string | undefined>(undefined);
  const licenseFileRef = useRef<HTMLInputElement>(null);
  const idFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: 'GB',
    bio: '',
    skills: '',
    hourlyRate: '',
    experience: '',
    city: '',
    country: '',
    isAvailable: false,
    licenseNumber: '',
    licenseType: '',
    licenseIssuingAuthority: '',
    licenseExpiry: '',
    languages: '',
    preferredWorkRadius: '',
  });

  useEffect(() => {
    if (mate) {
      setFormData({
        firstName: mate.firstName || '',
        lastName: mate.lastName || '',
        phone: mate.phone || '',
        phoneCountryCode: mate.phoneCountryCode || 'GB',
        bio: mate.bio || '',
        skills: mate.skills?.join(', ') || '',
        hourlyRate: mate.hourlyRate?.toString() || '',
        experience: mate.experience?.toString() || '',
        city: mate.city || '',
        country: mate.country || '',
        isAvailable: mate.isAvailable ?? false,
        licenseNumber: mate.licenseNumber || '',
        licenseType: mate.licenseType || '',
        licenseIssuingAuthority: mate.licenseIssuingAuthority || '',
        licenseExpiry: mate.licenseExpiry ? new Date(mate.licenseExpiry).toISOString().split('T')[0] : '',
        languages: mate.languages?.join(', ') || '',
        preferredWorkRadius: mate.preferredWorkRadius?.toString() || '',
      });
    }
  }, [mate]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!mate) return null;

  const lockedCountry = React.useMemo(() => platformCountry ? {
    name: platformCountry.countryName,
    code: platformCountry.countryCode,
    dialCode: platformCountry.dialCode,
    flag: platformCountry.flag,
  } : null, [platformCountry]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      router.push('/dashboard/mate');
    }
  };

  const confirmDiscardChanges = () => {
    setShowConfirmDialog(false);
    setHasUnsavedChanges(false);
    router.push('/dashboard/mate');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const resp = await uploadProfilePhoto(file);
      if (resp.success && resp.data?.url) {
        await updateUserProfile({ profilePhoto: resp.data.url });
        await fetchUser();
        toast.success('Profile photo updated successfully!');
      } else {
        throw new Error(resp.message || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: 'license' | 'id',
    setLoading: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be less than 10MB.');
      return;
    }

    setLoading(true);
    try {
      const resp = await uploadDocument(file, docType);
      if (resp.success && resp.data?.url) {
        // Update local state instead of fetchUser() to preserve form data
        if (docType === 'license') {
          setLocalLicenseDoc(resp.data.url);
          setLocalLicenseStatus('PENDING_REVIEW');
        } else {
          setLocalIdDoc(resp.data.url);
          setLocalIdStatus('PENDING');
        }
        toast.success(`${docType === 'license' ? 'License' : 'ID'} document uploaded successfully!`);
      } else {
        throw new Error(resp.message || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (formData.bio && formData.bio.length > 1000) {
      toast.error('Bio cannot exceed 1000 characters.');
      return;
    }
    if (platformCountry && formData.phoneCountryCode !== platformCountry.countryCode) {
      toast.error(`Only ${platformCountry.countryName} phone numbers are accepted on this platform.`);
      return;
    }

    const requiredFields = [
      'firstName', 'lastName', 'phone', 'country', 'city', 'bio',
      'licenseNumber', 'licenseType', 'licenseIssuingAuthority',
      'licenseExpiry', 'skills', 'hourlyRate', 'experience',
      'languages', 'preferredWorkRadius',
    ];

    const isProfileComplete = requiredFields.every((field) => {
      const val = (formData as any)[field];
      return val !== undefined && val !== null && String(val).trim() !== '';
    });

    if (!isProfileComplete) {
      toast.error('Please fill in all required fields to complete your profile.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        phoneCountryCode: formData.phoneCountryCode,
        bio: formData.bio.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
        experience: formData.experience ? Number(formData.experience) : undefined,
        skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
        isAvailable: formData.isAvailable,
        licenseNumber: formData.licenseNumber.trim(),
        licenseType: formData.licenseType.trim(),
        licenseIssuingAuthority: formData.licenseIssuingAuthority.trim(),
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : '',
        languages: formData.languages.split(',').map((s) => s.trim()).filter(Boolean),
        preferredWorkRadius: formData.preferredWorkRadius ? Number(formData.preferredWorkRadius) : undefined,
        isProfileComplete: true,
        isOnboardingComplete: true,
      });

      await fetchUser();
      setHasUnsavedChanges(false);
      toast.success('Profile updated successfully!');
      router.push('/dashboard/mate');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = `${mate.firstName} ${mate.lastName}`;
  const skillsList = formData.skills.split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── Sticky Sidebar ───────────────────────────────── */}
          <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-20">
            <Card className="overflow-hidden">

              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />

              {/* Avatar & Identity */}
              <div className="px-4 pt-5 pb-4 flex flex-col items-center text-center border-b border-[var(--color-border-primary)]">
                <div
                  className="relative group cursor-pointer mb-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar
                    src={mate.profilePhoto ?? undefined}
                    name={displayName}
                    size="xl"
                    className={isUploadingPhoto ? 'opacity-50' : 'group-hover:opacity-75 transition-opacity'}
                  />
                  {isUploadingPhoto ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-full transition-all">
                      <Camera className="h-4 w-4 text-white" />
                      <span className="text-[9px] text-white font-semibold uppercase tracking-wider mt-0.5">Change</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handlePhotoUpload}
                  />
                </div>

                <h2 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight truncate w-full px-1">
                  {displayName}
                </h2>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 uppercase tracking-wider">Security Professional</p>
              </div>

              {/* Quick Info */}
              <div className="px-4 py-3 space-y-2.5 border-b border-[var(--color-border-primary)]">
                <SidebarInfoRow icon={<MapPin className="h-3 w-3" />} label={formData.city && formData.country ? `${formData.city}, ${formData.country}` : 'Location not set'} />
                <SidebarInfoRow icon={<Mail className="h-3 w-3" />} label={mate.email || '—'} />
                <SidebarInfoRow icon={<Phone className="h-3 w-3" />} label={formData.phone || 'Phone not set'} />
                <SidebarInfoRow icon={<Star className="h-3 w-3" />} label={formData.hourlyRate ? `£${formData.hourlyRate}/hr` : 'Rate not set'} />
                <SidebarInfoRow icon={<Clock className="h-3 w-3" />} label={formData.experience ? `${formData.experience} yrs experience` : 'Experience not set'} />
              </div>

              {/* Availability Toggle */}
              <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
                <Toggle
                  label="Available for Work"
                  description="Show up in search results"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => handleChange('isAvailable', checked)}
                />
              </div>
            </Card>
          </div>

          {/* ── Form Panel ───────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            <form id="profile-edit-form" onSubmit={handleSubmit}>

              {/* Personal Details */}
              <Card className="overflow-visible mb-4">
                <SectionHeader icon={<User className="h-3.5 w-3.5" />} title="Personal Details" />
                <div className="px-4 py-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="First Name"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                    <Input
                      label="Last Name"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PhoneInput
                      label="Phone"
                      value={formData.phone}
                      onChange={(val) => handleChange('phone', val)}
                      onCountryChange={(c) => handleChange('phoneCountryCode', c.code)}
                      lockedCountry={lockedCountry}
                    />
                    <Input
                      label="Email Address"
                      value={mate.email}
                      disabled
                      helperText="Email cannot be changed."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="City"
                      required
                      placeholder="e.g. London"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                    <Input
                      label="Country"
                      required
                      placeholder="e.g. UK"
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Licenses & Credentials */}
              <Card className="overflow-visible mb-4">
                <SectionHeader icon={<Shield className="h-3.5 w-3.5" />} title="Licenses & Credentials" />
                <div className="px-4 py-4 space-y-3">

                  {/* License verification status banner */}
                  {(localLicenseStatus || mate.licenseStatus) && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      (localLicenseStatus || mate.licenseStatus) === 'VALID'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : (localLicenseStatus || mate.licenseStatus) === 'PENDING_REVIEW'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                      {(localLicenseStatus || mate.licenseStatus) === 'VALID' ? '✓ License Verified' : (localLicenseStatus || mate.licenseStatus) === 'PENDING_REVIEW' ? ' License Pending Admin Review' : `⚠ License Status: ${localLicenseStatus || mate.licenseStatus}`}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="SIA License Number"
                      required
                      placeholder="e.g. 1234567890"
                      value={formData.licenseNumber}
                      onChange={(e) => handleChange('licenseNumber', e.target.value)}
                    />
                    <Input
                      label="License Type"
                      required
                      placeholder="e.g. Door Supervisor"
                      value={formData.licenseType}
                      onChange={(e) => handleChange('licenseType', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Issuing Authority"
                      required
                      placeholder="e.g. SIA"
                      value={formData.licenseIssuingAuthority}
                      onChange={(e) => handleChange('licenseIssuingAuthority', e.target.value)}
                    />
                    <Input
                      label="Expiry Date"
                      type="date"
                      required
                      value={formData.licenseExpiry}
                      onChange={(e) => handleChange('licenseExpiry', e.target.value)}
                    />
                  </div>

                  {/* License Document Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--color-input-label)]">
                      License Document (PDF or Image) <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    {(localLicenseDoc || mate.licenseDocument) ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                        <FileText className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                        <a
                          href={localLicenseDoc || mate.licenseDocument || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-primary)] hover:underline truncate flex-1"
                        >
                          View Current Document
                        </a>
                        <button
                          type="button"
                          onClick={() => licenseFileRef.current?.click()}
                          disabled={isUploadingLicense}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
                        >
                          {isUploadingLicense ? 'Uploading...' : 'Replace'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => licenseFileRef.current?.click()}
                        disabled={isUploadingLicense}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-[var(--color-border-primary)] hover:border-[var(--color-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all text-xs"
                      >
                        {isUploadingLicense ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isUploadingLicense ? 'Uploading...' : 'Upload License Document'}
                      </button>
                    )}
                    <input
                      type="file"
                      ref={licenseFileRef}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => handleDocumentUpload(e, 'license', setIsUploadingLicense, licenseFileRef)}
                    />
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">Max 10MB. Accepted: PDF, PNG, JPG, WEBP</p>
                  </div>

                  {/* ID Document Upload */}
                  <div className="border-t border-[var(--color-border-primary)] pt-3 mt-3 space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">ID Verification</p>

                    {(localIdStatus || mate.idVerificationStatus) && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                        (localIdStatus || mate.idVerificationStatus) === 'VERIFIED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : (localIdStatus || mate.idVerificationStatus) === 'PENDING'
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}>
                        {(localIdStatus || mate.idVerificationStatus) === 'VERIFIED' ? '✓ ID Verified' : (localIdStatus || mate.idVerificationStatus) === 'PENDING' ? ' ID Pending Review' : `⚠ ID: ${localIdStatus || mate.idVerificationStatus}`}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-input-label)]">
                        ID Document (PDF or Image) <span className="text-[var(--color-danger)]">*</span>
                      </label>
                      {(localIdDoc || mate.idDocument) ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                          <FileText className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                          <a
                            href={localIdDoc || mate.idDocument || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--color-primary)] hover:underline truncate flex-1"
                          >
                            View Current ID Document
                          </a>
                          <button
                            type="button"
                            onClick={() => idFileRef.current?.click()}
                            disabled={isUploadingId}
                            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
                          >
                            {isUploadingId ? 'Uploading...' : 'Replace'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => idFileRef.current?.click()}
                          disabled={isUploadingId}
                          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-[var(--color-border-primary)] hover:border-[var(--color-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all text-xs"
                        >
                          {isUploadingId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {isUploadingId ? 'Uploading...' : 'Upload ID Document'}
                        </button>
                      )}
                      <input
                        type="file"
                        ref={idFileRef}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleDocumentUpload(e, 'id', setIsUploadingId, idFileRef)}
                      />
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">Max 10MB. Accepted: PDF, PNG, JPG, WEBP</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Professional Info */}
              <Card className="overflow-visible">
                <SectionHeader icon={<Briefcase className="h-3.5 w-3.5" />} title="Professional Info" />
                <div className="px-4 py-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Hourly Rate (£)"
                      required
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 15.00"
                      value={formData.hourlyRate}
                      onChange={(e) => handleChange('hourlyRate', e.target.value)}
                    />
                    <Input
                      label="Experience (Years)"
                      required
                      type="number"
                      min="0"
                      placeholder="e.g. 3"
                      value={formData.experience}
                      onChange={(e) => handleChange('experience', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Work Radius (miles)"
                      required
                      type="number"
                      min="1"
                      placeholder="e.g. 25"
                      value={formData.preferredWorkRadius}
                      onChange={(e) => handleChange('preferredWorkRadius', e.target.value)}
                    />
                    <Input
                      label="Languages Spoken"
                      required
                      placeholder="e.g. English"
                      value={formData.languages}
                      onChange={(e) => handleChange('languages', e.target.value)}
                    />
                  </div>

                  <Input
                    label="Skills (Comma separated)"
                    required
                    placeholder="e.g. Crowd Control, First Aid"
                    value={formData.skills}
                    onChange={(e) => handleChange('skills', e.target.value)}
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-input-label)]">
                      Bio <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    <textarea
                      className="flex w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] min-h-[90px] resize-y"
                      placeholder="Tell clients a bit about your professional background..."
                      value={formData.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      maxLength={1000}
                    />
                    <p className="text-[10px] text-right text-[var(--color-text-tertiary)]">
                      {formData.bio.length} / 1000
                    </p>
                  </div>
                </div>
              </Card>

              {/* Save Button — bottom */}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isSaving}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Changes
                </Button>
              </div>

            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={confirmDiscardChanges}
        onCancel={() => setShowConfirmDialog(false)}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes to your profile. Are you sure you want to leave without saving?"
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
      />
    </div>
  );
}

/* ─── Tiny sub-components ──────────────────────────────────── */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
      <span className="text-[var(--color-text-tertiary)]">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {title}
      </span>
    </div>
  );
}

function SidebarInfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2 text-[var(--color-text-secondary)]">
      <span className="mt-0.5 flex-shrink-0 text-[var(--color-text-tertiary)]">{icon}</span>
      <span className="text-[11px] leading-snug truncate">{label}</span>
    </div>
  );
}

function FieldStatus({ label, filled }: { label: string; filled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-[var(--color-text-tertiary)] truncate">{label}</span>
      <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${filled ? 'bg-emerald-400' : 'bg-[var(--color-border-primary)]'}`} />
    </div>
  );
}