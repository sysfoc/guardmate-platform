// app/admin/profile/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { usePlatformContext } from '@/context/PlatformContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { updateUserProfile, uploadProfilePhoto } from '@/lib/api/user.api';
import type { AdminProfile } from '@/types/user.types';
import {
  resolvePhoneCountryLock,
  isGrandfatheredCountry,
  validatePhoneCountrySubmission,
} from '@/lib/utils/phoneCountry';
import { countries as allCountries } from '@/constants/countries';
import toast from 'react-hot-toast';
import { Camera, Save, ArrowLeft, Loader2, Info } from 'lucide-react';
export default function AdminProfileEdit() {
  const router = useRouter();
  const { user, fetchUser } = useUser();
  const { platformCountry } = usePlatformContext();

  const admin = user as AdminProfile | null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: '',
    bio: '',
  });

  useEffect(() => {
    if (admin) {
      setFormData({
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        phone: admin.phone || '',
        phoneCountryCode: admin.phoneCountryCode || '',
        bio: admin.bio || '',
      });
    }
  }, [admin]);

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

  // Grandfather policy: an admin who registered while the lock was, say, PK keeps
  // their PK number even after switching the platform to US. They can opt in to
  // migrate to the new platform country.
  const userSavedCountry = admin?.phoneCountryCode ?? null;
  const [forceSwitchToPlatform, setForceSwitchToPlatform] = useState(false);

  const lockedCountry = React.useMemo(
    () => resolvePhoneCountryLock(platformCountry, userSavedCountry, forceSwitchToPlatform),
    [platformCountry, userSavedCountry, forceSwitchToPlatform],
  );

  const grandfathered = !forceSwitchToPlatform && isGrandfatheredCountry(platformCountry, userSavedCountry);
  const userCountryMeta = React.useMemo(
    () => (userSavedCountry ? allCountries.find((c) => c.code === userSavedCountry) ?? null : null),
    [userSavedCountry],
  );

  React.useEffect(() => {
    if (lockedCountry && formData.phoneCountryCode !== lockedCountry.code) {
      setFormData((prev) => ({ ...prev, phoneCountryCode: lockedCountry.code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCountry?.code]);

  const handleSwitchToPlatformCountry = () => {
    if (!platformCountry) return;
    setForceSwitchToPlatform(true);
    setFormData((prev) => ({
      ...prev,
      phone: '',
      phoneCountryCode: platformCountry.countryCode,
    }));
    setHasUnsavedChanges(true);
  };

  const handleUndoSwitch = () => {
    setForceSwitchToPlatform(false);
    setFormData((prev) => ({
      ...prev,
      phone: admin?.phone ?? '',
      phoneCountryCode: userSavedCountry ?? prev.phoneCountryCode,
    }));
    setHasUnsavedChanges(true);
  };

  if (!admin) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      router.push('/admin');
    }
  };

  const confirmDiscardChanges = () => {
    setShowConfirmDialog(false);
    setHasUnsavedChanges(false);
    router.push('/admin');
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
        toast.success('Admin photo updated successfully!');
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

    const phoneCountryError = validatePhoneCountrySubmission({
      submitted: formData.phoneCountryCode || null,
      platformCountry,
      userSavedCountry,
      phoneIsEmpty: !formData.phone.trim(),
    });
    if (phoneCountryError) {
      toast.error(phoneCountryError);
      return;
    }

    // Source of truth (grandfather policy): persist the resolved lock if any,
    // otherwise the user's explicit selection. Never a hardcoded default.
    const resolvedPhoneCountryCode = lockedCountry
      ? lockedCountry.code
      : (formData.phoneCountryCode || null);

    setIsSaving(true);
    try {
      await updateUserProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        phoneCountryCode: resolvedPhoneCountryCode,
        bio: formData.bio.trim(),
      });

      await fetchUser();
      setHasUnsavedChanges(false);
      toast.success('Admin profile updated successfully!');
      router.push('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGoBack}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Admin Settings</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Manage your personal admin account</p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left Col: Avatar & Status */}
        <Card className="col-span-1 p-6 space-y-6 flex flex-col items-center text-center h-fit">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar
              src={admin.profilePhoto ?? undefined}
              name={`${admin.firstName} ${admin.lastName}`}
              size="xl"
              className={isUploadingPhoto ? 'opacity-50' : 'group-hover:opacity-75'}
            />
            {isUploadingPhoto ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity">
                <Camera className="h-6 w-6 text-white mb-1" />
                <span className="text-xs text-white font-medium">Upload</span>
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

          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {admin.firstName} {admin.lastName}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Platform Administrator</p>
          </div>
        </Card>

        {/* Right Col: Form Fields */}
        <Card className="col-span-1 md:col-span-2 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              <h3 className="text-base font-bold text-[var(--color-text-primary)] border-b pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {grandfathered && platformCountry && userCountryMeta && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-[var(--color-text-primary)]">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <p className="font-medium">
                          This platform now operates in {platformCountry.countryName} ({platformCountry.flag}).
                        </p>
                        <p className="mt-0.5 text-[var(--color-text-secondary)]">
                          Your number is on record as a {userCountryMeta.name} ({userCountryMeta.flag}) number. You may keep it, or switch.
                        </p>
                        <button
                          type="button"
                          onClick={handleSwitchToPlatformCountry}
                          className="mt-2 inline-flex items-center rounded-md bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/30 dark:text-amber-300"
                        >
                          Switch to a {platformCountry.countryName} number
                        </button>
                      </div>
                    </div>
                  )}
                  {forceSwitchToPlatform && platformCountry && userCountryMeta && (
                    <div className="flex items-start gap-2 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 text-xs text-[var(--color-text-primary)]">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      <div className="flex-1">
                        <p className="font-medium">Enter your new {platformCountry.countryName} number below.</p>
                        <button
                          type="button"
                          onClick={handleUndoSwitch}
                          className="mt-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          Undo and keep my {userCountryMeta.name} number
                        </button>
                      </div>
                    </div>
                  )}
                  <PhoneInput
                    label="Phone Number"
                    value={formData.phone}
                    defaultCountry={formData.phoneCountryCode as any}
                    onChange={(val) => handleChange('phone', val)}
                    onCountryChange={(c) => handleChange('phoneCountryCode', c.code)}
                    lockedCountry={lockedCountry}
                  />
                </div>
                <Input
                  label="Admin Email"
                  value={admin.email}
                  disabled
                  helperText="Primary email cannot be changed directly."
                />
              </div>

              <div className="space-y-1 mt-4">
                <label className="text-sm font-medium text-[var(--color-input-label)]">
                  Internal Note / Bio
                </label>
                <textarea
                  className="flex w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] min-h-[120px] resize-y"
                  placeholder="Optional internal notes..."
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  maxLength={1000}
                />
                <p className="text-xs text-right text-[var(--color-text-muted)] mt-1">
                  {formData.bio.length} / 1000
                </p>
              </div>
            </div>

          </form>
        </Card>
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
