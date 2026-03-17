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
import { Badge } from '@/components/ui/Badge';
import { updateUserProfile, uploadProfilePhoto, uploadDocument } from '@/lib/api/user.api';
import type { BossProfile, BossProfileUpdatePayload } from '@/types/user.types';
import { VerificationStatus, LicenseStatus } from '@/types/enums';
import toast from 'react-hot-toast';
import {
  Camera, Save, Loader2, Building2, User, Globe, MapPin, Phone, Mail, FileText, Upload, ChevronLeft,
} from 'lucide-react';

export default function BossProfileEdit() {
  const router = useRouter();
  const { user, fetchUser } = useUser();
  const { platformCountry } = usePlatformContext();

  const boss = user as BossProfile | null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyLicenseFileRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [localCompanyLicenseDoc, setLocalCompanyLicenseDoc] = useState<string | undefined>(undefined);
  const [localCompanyLicenseStatus, setLocalCompanyLicenseStatus] = useState<LicenseStatus | undefined>(undefined);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: 'GB',
    companyName: '',
    companyRegistrationNumber: '',
    industry: '',
    companyWebsite: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyCountry: '',
    companyPostalCode: '',
    companyPhone: '',
    companyEmail: '',
    companyDescription: '',
    companyLicenseNumber: '',
    companyLicenseExpiry: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (boss) {
      setFormData({
        firstName: boss.firstName || '',
        lastName: boss.lastName || '',
        phone: boss.phone || '',
        phoneCountryCode: boss.phoneCountryCode || 'GB',
        companyName: boss.companyName || '',
        companyRegistrationNumber: boss.companyRegistrationNumber || '',
        industry: boss.industry || '',
        companyWebsite: boss.companyWebsite || '',
        companyAddress: boss.companyAddress || '',
        companyCity: boss.companyCity || '',
        companyState: boss.companyState || '',
        companyCountry: boss.companyCountry || '',
        companyPostalCode: boss.companyPostalCode || '',
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

  const requiredFields = [
    'firstName', 'lastName', 'phone', 
    'companyName', 'companyRegistrationNumber', 'companyLicenseNumber',
    'companyLicenseExpiry', 'companyAddress', 'companyCity', 'companyCountry', 
    'companyPhone', 'companyEmail', 'companyDescription', 'industry', 'companyPostalCode'
  ];

  const calculateCompletion = () => {
    const filledCount = requiredFields.filter(f => {
      const val = (formData as any)[f];
      if (f === 'companyLicenseExpiry') return val && val !== '';
      return val && val.trim() !== '';
    }).length;

    const hasDoc = !!(localCompanyLicenseDoc || boss?.companyLicenseDocument);
    const totalFilled = filledCount + (hasDoc ? 1 : 0);
    const totalRequired = requiredFields.length + 1; 

    return Math.round((totalFilled / totalRequired) * 100);
  };

  const completion = calculateCompletion();

  const lockedCountry = React.useMemo(() => platformCountry ? {
    name: platformCountry.countryName,
    code: platformCountry.countryCode,
    dialCode: platformCountry.dialCode,
    flag: platformCountry.flag,
  } : null, [platformCountry]);

  if (!boss) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      router.push('/dashboard/boss');
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    if (formData.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail)) {
      newErrors.companyEmail = 'Invalid email format';
    }
    if (formData.companyWebsite && !/^https?:\/\/.*/.test(formData.companyWebsite)) {
      newErrors.companyWebsite = 'Must start with http:// or https://';
    }

    requiredFields.forEach(field => {
      if (!(formData as any)[field]?.trim()) {
        if (!newErrors[field]) newErrors[field] = 'Required field';
      }
    });

    if (!(localCompanyLicenseDoc || boss?.companyLicenseDocument)) {
      newErrors.companyLicenseDocument = 'License document required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const resp = await uploadProfilePhoto(file);
      if (resp.success && resp.data?.url) {
        await updateUserProfile({ profilePhoto: resp.data.url });
        await fetchUser();
        toast.success('Company logo updated!');
      }
    } catch (error: any) {
      toast.error('Upload failed.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCompanyLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLicense(true);
    try {
      const resp = await uploadDocument(file, 'companyLicense');
      if (resp.success && resp.data?.url) {
        setLocalCompanyLicenseDoc(resp.data.url);
        setLocalCompanyLicenseStatus(LicenseStatus.PENDING_REVIEW);
        toast.success('License uploaded!');
      }
    } catch (error: any) {
      toast.error('Upload failed.');
    } finally {
      setIsUploadingLicense(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix errors.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        ...formData,
        companyLicenseExpiry: formData.companyLicenseExpiry ? new Date(formData.companyLicenseExpiry).toISOString() : null,
        companyLicenseDocument: localCompanyLicenseDoc || boss.companyLicenseDocument,
        isProfileComplete: completion >= 100,
        isOnboardingComplete: true,
      } as BossProfileUpdatePayload);

      await fetchUser();
      setHasUnsavedChanges(false);
      toast.success('Profile saved!');
      router.push('/dashboard/boss');
    } catch (error: any) {
      toast.error('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = formData.companyName || `${boss.firstName} ${boss.lastName}`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Professional Profile Header */}
      <div className="h-32 w-full bg-gradient-to-r from-[var(--color-primary)] to-indigo-700 opacity-90" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Card */}
          <Card className="p-4 border-none shadow-xl ring-1 ring-[var(--color-border-primary)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-5">
                <div className="relative group">
                  <Avatar 
                    src={boss?.profilePhoto} 
                    name={displayName} 
                    size="xl" 
                    className="ring-4 ring-[var(--color-bg-primary)] shadow-2xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-[var(--color-primary)] text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-xl font-black text-[var(--color-text-primary)] leading-tight">
                    {boss?.firstName} {boss?.lastName}
                  </h1>
                  <p className="text-[10px] text-[var(--color-text-secondary)] truncate">Account: {boss?.email}</p>
                  <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {boss?.companyName || 'Company Profile'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 mt-4 md:mt-0">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleGoBack}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                  className="flex-1 sm:flex-none"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  loading={isSaving} 
                  leftIcon={<Save className="h-4 w-4" />}
                  className="flex-1 sm:flex-none px-5"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Business Focus */}
            <div className="space-y-4">
              <Card padding="md">
                <SectionHeader icon={<Building2 className="h-4 w-4" />} title="Business Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                  <Input label="Company Legal Name" value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} error={errors.companyName} />
                  <Input label="Registration Number" value={formData.companyRegistrationNumber} onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)} error={errors.companyRegistrationNumber} />
                  <Input label="Industry" value={formData.industry} onChange={(e) => handleChange('industry', e.target.value)} placeholder="e.g. Retail, Construction" />
                  <Input label="Company Website" value={formData.companyWebsite} onChange={(e) => handleChange('companyWebsite', e.target.value)} error={errors.companyWebsite} placeholder="https://example.com" />
                </div>
                <div className="mt-3">
                  <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Company Description</label>
                  <textarea
                    value={formData.companyDescription}
                    rows={6}
                    onChange={(e) => handleChange('companyDescription', e.target.value)}
                    placeholder="Tell potential Mates about your company..."
                    className="w-full min-h-[80px] p-2.5 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none resize-none"
                  />
                </div>
              </Card>

              <Card padding="md">
                <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Business Address" />
                <div className="space-y-3 mt-4">
                  <Input label="Street Address" value={formData.companyAddress} onChange={(e) => handleChange('companyAddress', e.target.value)} error={errors.companyAddress} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" value={formData.companyCity} onChange={(e) => handleChange('companyCity', e.target.value)} error={errors.companyCity} />
                    <Input label="State/Region" value={formData.companyState} onChange={(e) => handleChange('companyState', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Postal Code" value={formData.companyPostalCode} onChange={(e) => handleChange('companyPostalCode', e.target.value)} error={errors.companyPostalCode} />
                    <Input label="Country" value={formData.companyCountry} onChange={(e) => handleChange('companyCountry', e.target.value)} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Personal & Support Info */}
            <div className="space-y-4">
              <Card padding="md">
                <SectionHeader icon={<User className="h-4 w-4" />} title="Personal Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                  <Input label="First Name" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} error={errors.firstName} />
                  <Input label="Last Name" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} error={errors.lastName} />
                </div>
                <div className="mt-3">
                  <PhoneInput 
                    label="Personal Phone" 
                    value={formData.phone} 
                    defaultCountry={formData.phoneCountryCode as any} 
                    onChange={(v: string) => { setFormData(prev => ({ ...prev, phone: v })); setHasUnsavedChanges(true); }} 
                    error={errors.phone} 
                  />
                </div>
              </Card>

              <Card padding="md">
                <SectionHeader icon={<Phone className="h-4 w-4" />} title="Business Contact" />
                <div className="space-y-3 mt-4">
                  <Input label="Business Phone" value={formData.companyPhone} onChange={(e) => handleChange('companyPhone', e.target.value)} error={errors.companyPhone} />
                  <Input label="Business Email" value={formData.companyEmail} onChange={(e) => handleChange('companyEmail', e.target.value)} error={errors.companyEmail} />
                </div>
              </Card>

              <Card padding="md">
                <SectionHeader icon={<FileText className="h-4 w-4" />} title="Legal Document" />
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="License Number" value={formData.companyLicenseNumber} onChange={(e) => handleChange('companyLicenseNumber', e.target.value)} error={errors.companyLicenseNumber} />
                    <Input label="License Expiry" type="date" value={formData.companyLicenseExpiry} onChange={(e) => handleChange('companyLicenseExpiry', e.target.value)} error={errors.companyLicenseExpiry} />
                  </div>
                  
                  <div className="pt-1.5">
                    <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">License Document</label>
                    <DocUploadRow
                      label="Company License"
                      url={localCompanyLicenseDoc || boss?.companyLicenseDocument || undefined}
                      isUploading={isUploadingLicense}
                      onUpload={() => companyLicenseFileRef.current?.click()}
                      onReview={localCompanyLicenseDoc || boss?.companyLicenseDocument ? (url: string) => window.open(url, '_blank') : undefined}
                      status={(localCompanyLicenseStatus || boss?.companyLicenseStatus || '') as any}
                    />
                    <input type="file" ref={companyLicenseFileRef} onChange={handleCompanyLicenseUpload} className="hidden" accept=".pdf,image/*" />
                    {errors.companyLicenseDocument && <p className="text-[10px] text-[var(--color-danger)] font-bold mt-1 uppercase">{errors.companyLicenseDocument}</p>}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setHasUnsavedChanges(false);
          router.push('/dashboard/boss');
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave?"
        confirmLabel="Leave"
        variant="danger"
      />
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border-primary)]">
      <div className="text-[var(--color-primary)]">{icon}</div>
      <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function DocUploadRow({ 
  label, url, isUploading, onUpload, onReview, status 
}: { 
  label: string; 
  url?: string; 
  isUploading: boolean; 
  onUpload: () => void;
  onReview?: (url: string) => void;
  status?: LicenseStatus | VerificationStatus | string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${url ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-tight leading-none">{label}</p>
          <div className="mt-1">
            {url ? (
               <Badge 
               variant={
                 status === LicenseStatus.VALID || status === VerificationStatus.VERIFIED ? 'success' : 
                 status === LicenseStatus.EXPIRED || status === VerificationStatus.REJECTED ? 'danger' : 'warning'
               } 
               className="text-[9px] h-4 py-0 font-bold"
             >
               {status || 'PENDING'}
             </Badge>
            ) : (
              <span className="text-[9px] text-[var(--color-text-tertiary)] font-bold uppercase">Not Uploaded</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {url && onReview && (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => onReview(url)}>
            View
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 border-dashed" loading={isUploading} onClick={onUpload}>
          {url ? 'Replace' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}