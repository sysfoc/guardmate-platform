'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { updateUserProfile, uploadProfilePhoto, uploadDocument } from '@/lib/api/user.api';
import type { BossProfile } from '@/types/user.types';
import toast from 'react-hot-toast';
import { Camera, Save, ArrowLeft, Loader2, Building2, User, Globe, MapPin, Phone, Mail, FileText, BadgeCheck, Upload } from 'lucide-react';

export default function BossProfileEdit() {
  const router = useRouter();
  const { user, fetchUser } = useUser();

  const boss = user as BossProfile | null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [localCompanyLicenseDoc, setLocalCompanyLicenseDoc] = useState<string | undefined>(undefined);
  const [localCompanyLicenseStatus, setLocalCompanyLicenseStatus] = useState<string | undefined>(undefined);
  const companyLicenseFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: 'GB',
    bio: '',
    companyName: '',
    companyRegistrationNumber: '',
    industry: '',
    companyWebsite: '',
    city: '',
    country: '',
    companyAddress: '',
    companyCity: '',
    companyCountry: '',
    companyPhone: '',
    companyEmail: '',
    companyDescription: '',
    companyLicenseNumber: '',
    companyLicenseExpiry: '',
  });

  useEffect(() => {
    if (boss) {
      setFormData({
        firstName: boss.firstName || '',
        lastName: boss.lastName || '',
        phone: boss.phone || '',
        phoneCountryCode: boss.phoneCountryCode || 'GB',
        bio: boss.bio || '',
        companyName: boss.companyName || '',
        companyRegistrationNumber: boss.companyRegistrationNumber || '',
        industry: boss.industry || '',
        companyWebsite: boss.companyWebsite || '',
        city: boss.city || '',
        country: boss.country || '',
        companyAddress: boss.companyAddress || '',
        companyCity: boss.companyCity || '',
        companyCountry: boss.companyCountry || '',
        companyPhone: boss.companyPhone || '',
        companyEmail: boss.companyEmail || '',
        companyDescription: boss.companyDescription || '',
        companyLicenseNumber: boss.companyLicenseNumber || '',
        companyLicenseExpiry: boss.companyLicenseExpiry ? new Date(boss.companyLicenseExpiry).toISOString().split('T')[0] : '',
      });
    }
  }, [boss]);

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

  if (!boss) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      router.push('/dashboard/boss');
    }
  };

  const confirmDiscardChanges = () => {
    setShowConfirmDialog(false);
    setHasUnsavedChanges(false);
    router.push('/dashboard/boss');
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
        toast.success('Company logo / Profile photo updated successfully!');
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

  const handleCompanyLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingLicense(true);
    try {
      const resp = await uploadDocument(file, 'companyLicense');
      if (resp.success && resp.data?.url) {
        // Update local state instead of fetchUser() to preserve form data
        setLocalCompanyLicenseDoc(resp.data.url);
        setLocalCompanyLicenseStatus('PENDING_REVIEW');
        toast.success('Company license document uploaded successfully!');
      } else {
        throw new Error(resp.message || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document.');
    } finally {
      setIsUploadingLicense(false);
      if (companyLicenseFileRef.current) companyLicenseFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (formData.companyWebsite && !/^https?:\/\/.*/.test(formData.companyWebsite)) {
      toast.error('Website must be a valid URL starting with http:// or https://');
      return;
    }
    if (formData.bio && formData.bio.length > 1000) {
      toast.error('Bio cannot exceed 1000 characters.');
      return;
    }

    const requiredFields = [
      'firstName', 'lastName', 'phone', 'country', 'city', 'bio',
      'companyName', 'companyRegistrationNumber', 'industry',
      'companyAddress', 'companyCity', 'companyCountry', 'companyPhone',
      'companyEmail', 'companyDescription',
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
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        companyName: formData.companyName.trim(),
        companyRegistrationNumber: formData.companyRegistrationNumber.trim(),
        industry: formData.industry.trim(),
        companyWebsite: formData.companyWebsite.trim(),
        companyAddress: formData.companyAddress.trim(),
        companyCity: formData.companyCity.trim(),
        companyCountry: formData.companyCountry.trim(),
        companyPhone: formData.companyPhone.trim(),
        companyEmail: formData.companyEmail.trim(),
        companyDescription: formData.companyDescription.trim(),
        companyLicenseNumber: formData.companyLicenseNumber.trim(),
        companyLicenseExpiry: formData.companyLicenseExpiry ? new Date(formData.companyLicenseExpiry).toISOString() : null,
        isProfileComplete: true,
        isOnboardingComplete: true,
      });

      await fetchUser();
      setHasUnsavedChanges(false);
      toast.success('Profile updated successfully!');
      router.push('/dashboard/boss');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = formData.companyName || `${boss.firstName} ${boss.lastName}`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-7 py-4">

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
                    src={boss.profilePhoto ?? undefined}
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
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 uppercase tracking-wider">Boss · Employer</p>
              </div>

              {/* Quick Info */}
              <div className="px-4 py-3 space-y-2.5 border-b border-[var(--color-border-primary)]">
                <SidebarInfoRow icon={<Building2 className="h-3 w-3" />} label={formData.industry || 'Industry not set'} />
                <SidebarInfoRow icon={<MapPin className="h-3 w-3" />} label={formData.city && formData.country ? `${formData.city}, ${formData.country}` : 'Location not set'} />
                <SidebarInfoRow icon={<Mail className="h-3 w-3" />} label={boss.email || '—'} />
                <SidebarInfoRow icon={<Phone className="h-3 w-3" />} label={formData.phone || 'Phone not set'} />
                {formData.companyWebsite && (
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-[var(--color-text-tertiary)]">
                      <Globe className="h-3 w-3" />
                    </span>
                    <a
                      href={formData.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] leading-snug truncate text-blue-500 hover:text-blue-600 hover:underline transition-colors"
                    >
                      {formData.companyWebsite.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>

              {/* Company Description */}
              {formData.companyDescription && (
                <div className="px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">About</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-5">
                    {formData.companyDescription}
                  </p>
                </div>
              )}

            </Card>
          </div>

          {/* ── Form Panel ───────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            <form id="boss-profile-edit-form" onSubmit={handleSubmit}>

              {/* Business Details */}
              <Card className="overflow-visible mb-4">
                <SectionHeader icon={<Building2 className="h-3.5 w-3.5" />} title="Business Details" />
                <div className="px-4 py-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Company Name"
                      placeholder="e.g. Shield Security Ltd."
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                    />
                    <Input
                      label="Company Reg Number"
                      placeholder="e.g. 12345678"
                      value={formData.companyRegistrationNumber}
                      onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="License Number"
                      placeholder="e.g. LIC-9999"
                      value={formData.companyLicenseNumber}
                      onChange={(e) => handleChange('companyLicenseNumber', e.target.value)}
                    />
                    <Input
                      label="License Expiry (Optional)"
                      type="date"
                      value={formData.companyLicenseExpiry}
                      onChange={(e) => handleChange('companyLicenseExpiry', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Industry"
                      required
                      placeholder="e.g. Events, Retail"
                      value={formData.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                    />
                  </div>

                  {/* Company License Status Badge */}
                  {(localCompanyLicenseStatus || boss.companyLicenseStatus) && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      (localCompanyLicenseStatus || boss.companyLicenseStatus) === 'VALID'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : (localCompanyLicenseStatus || boss.companyLicenseStatus) === 'PENDING_REVIEW'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                      {(localCompanyLicenseStatus || boss.companyLicenseStatus) === 'VALID' ? '✓ Company License Verified' : (localCompanyLicenseStatus || boss.companyLicenseStatus) === 'PENDING_REVIEW' ? ' License Pending Admin Review' : `⚠ License Status: ${localCompanyLicenseStatus || boss.companyLicenseStatus}`}
                    </div>
                  )}

                  {/* Company License Document Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--color-input-label)]">
                      Company License Document (PDF or Image) <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    {(localCompanyLicenseDoc || boss.companyLicenseDocument) ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                        <FileText className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                        <a
                          href={localCompanyLicenseDoc || boss.companyLicenseDocument || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-primary)] hover:underline truncate flex-1"
                        >
                          View Current Document
                        </a>
                        <button
                          type="button"
                          onClick={() => companyLicenseFileRef.current?.click()}
                          disabled={isUploadingLicense}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
                        >
                          {isUploadingLicense ? 'Uploading...' : 'Replace'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => companyLicenseFileRef.current?.click()}
                        disabled={isUploadingLicense}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-[var(--color-border-primary)] hover:border-[var(--color-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all text-xs"
                      >
                        {isUploadingLicense ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isUploadingLicense ? 'Uploading...' : 'Upload Company License'}
                      </button>
                    )}
                    <input
                      type="file"
                      ref={companyLicenseFileRef}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleCompanyLicenseUpload}
                    />
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">Max 10MB. Accepted: PDF, PNG, JPG, WEBP</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Company Email"
                      required
                      type="email"
                      placeholder="contact@company.com"
                      value={formData.companyEmail}
                      onChange={(e) => handleChange('companyEmail', e.target.value)}
                    />
                    <Input
                      label="Company Phone"
                      required
                      placeholder="+44 20 7123 4567"
                      value={formData.companyPhone}
                      onChange={(e) => handleChange('companyPhone', e.target.value)}
                    />
                  </div>

                  <Input
                    label="Address"
                    required
                    placeholder="123 Business Road"
                    value={formData.companyAddress}
                    onChange={(e) => handleChange('companyAddress', e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="City"
                      required
                      placeholder="e.g. London"
                      value={formData.companyCity}
                      onChange={(e) => handleChange('companyCity', e.target.value)}
                    />
                    <Input
                      label="Country"
                      required
                      placeholder="e.g. UK"
                      value={formData.companyCountry}
                      onChange={(e) => handleChange('companyCountry', e.target.value)}
                    />
                  </div>

                  <Input
                    label="Website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.companyWebsite}
                    onChange={(e) => handleChange('companyWebsite', e.target.value)}
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-input-label)]">
                      Company Description <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    <textarea
                      className="flex w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] min-h-[90px] resize-y"
                      placeholder="Describe your company's mission and services..."
                      value={formData.companyDescription}
                      onChange={(e) => handleChange('companyDescription', e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Admin Contact */}
              <Card className="overflow-visible">
                <SectionHeader icon={<User className="h-3.5 w-3.5" />} title="Admin Contact" />
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
                    />
                    <Input
                      label="Account Email"
                      value={boss.email}
                      disabled
                      helperText="Primary email cannot be changed."
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

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-input-label)]">
                      Personal Bio <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    <textarea
                      className="flex w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] min-h-[90px] resize-y"
                      placeholder="Brief description about yourself..."
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