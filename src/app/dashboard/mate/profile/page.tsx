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
import { Checkbox } from '@/components/ui/Checkbox';
import { CertificateBadges } from '@/components/ui/CertificateBadges';
import { updateUserProfile, uploadProfilePhoto, uploadDocument, verifyABN } from '@/lib/api/user.api';
import type { MateProfile, MateProfileUpdatePayload } from '@/types/user.types';
import { VerificationStatus, LicenseStatus, CertificateStatus } from '@/types/enums';
import { ABNStatus, AustralianState, AustralianStateNames } from '@/types/abr.types';
import toast from 'react-hot-toast';
import {
  Camera, Save, Loader2, Upload, FileText, AlertCircle, Heart,
  User, Shield, Briefcase, MapPin, Mail, Star, Clock, Plus, X, Globe, Calendar, Trash2, ChevronLeft, HardHat,
  Building2, CheckCircle2, AlertTriangle
} from 'lucide-react';

export default function MateProfileEdit() {
  const router = useRouter();
  const { user, fetchUser } = useUser();
  const { platformCountry } = usePlatformContext();

  const mate = user as MateProfile | null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const licenseFileRef = useRef<HTMLInputElement>(null);
  const idFileRef = useRef<HTMLInputElement>(null);
  const firstAidFileRef = useRef<HTMLInputElement>(null);
  const whiteCardFileRef = useRef<HTMLInputElement>(null);
  const childrenCheckFileRef = useRef<HTMLInputElement>(null);
  const victorianLicenceFileRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingFirstAid, setIsUploadingFirstAid] = useState(false);
  const [isUploadingWhiteCard, setIsUploadingWhiteCard] = useState(false);
  const [isUploadingChildrenCheck, setIsUploadingChildrenCheck] = useState(false);
  const [isUploadingVictorianLicence, setIsUploadingVictorianLicence] = useState(false);
  const [showClearWhiteCardDialog, setShowClearWhiteCardDialog] = useState(false);
  const [showClearChildrenCheckDialog, setShowClearChildrenCheckDialog] = useState(false);

  // ABN Section State
  const [abnInput, setAbnInput] = useState('');
  const [abnState, setAbnState] = useState<AustralianState | ''>('');
  const [isVerifyingABN, setIsVerifyingABN] = useState(false);

  const [localLicenseDoc, setLocalLicenseDoc] = useState<string | undefined>(undefined);
  const [localIdDoc, setLocalIdDoc] = useState<string | undefined>(undefined);
  const [localFirstAidDoc, setLocalFirstAidDoc] = useState<string | undefined>(undefined);
  const [localWhiteCardDoc, setLocalWhiteCardDoc] = useState<string | undefined>(undefined);
  const [localChildrenCheckDoc, setLocalChildrenCheckDoc] = useState<string | undefined>(undefined);
  const [localVictorianLicenceDoc, setLocalVictorianLicenceDoc] = useState<string | undefined>(undefined);

  const [worksOnConstructionSite, setWorksOnConstructionSite] = useState(false);
  const [worksWithChildren, setWorksWithChildren] = useState(false);
  const [firstAidExpiry, setFirstAidExpiry] = useState('');
  const [whiteCardExpiry, setWhiteCardExpiry] = useState('');
  const [childrenCheckExpiry, setChildrenCheckExpiry] = useState('');
  const [victorianLicenceExpiry, setVictorianLicenceExpiry] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: 'GB',
    bio: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    address: '',
    experience: 0,
    hourlyRate: 0,
    preferredWorkRadius: 0,
    minimumHours: 0,
    skills: [] as string[],
    languages: [] as string[],
    isAvailable: true,
    licenseNumber: '',
    licenseType: '',
    licenseExpiry: '',
    idExpiry: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mate) {
      setFormData({
        firstName: mate.firstName || '',
        lastName: mate.lastName || '',
        phone: mate.phone || '',
        phoneCountryCode: mate.phoneCountryCode || 'GB',
        bio: mate.bio || '',
        address: mate.address || '',
        city: mate.city || '',
        state: mate.state || '',
        country: mate.country || '',
        postalCode: mate.postalCode || '',
        experience: mate.experience || 0,
        hourlyRate: mate.hourlyRate || 0,
        preferredWorkRadius: mate.preferredWorkRadius || 0,
        minimumHours: mate.minimumHours || 0,
        skills: mate.skills || [],
        languages: mate.languages || [],
        isAvailable: mate.isAvailable ?? true,
        licenseNumber: mate.licenseNumber || '',
        licenseType: mate.licenseType || '',
        licenseExpiry: mate.licenseExpiry ? new Date(mate.licenseExpiry).toISOString().split('T')[0] : '',
        idExpiry: mate.idExpiry ? new Date(mate.idExpiry).toISOString().split('T')[0] : '',
      });
      setWorksOnConstructionSite(mate.worksOnConstructionSite ?? false);
      setWorksWithChildren(mate.worksWithChildren ?? false);
      setFirstAidExpiry(mate.firstAidCertificateExpiry ? new Date(mate.firstAidCertificateExpiry).toISOString().split('T')[0] : '');
      setWhiteCardExpiry(mate.constructionWhiteCardExpiry ? new Date(mate.constructionWhiteCardExpiry).toISOString().split('T')[0] : '');
      setChildrenCheckExpiry(mate.workingWithChildrenCheckExpiry ? new Date(mate.workingWithChildrenCheckExpiry).toISOString().split('T')[0] : '');
      setVictorianLicenceExpiry(mate.victorianBusinessLicenceExpiry ? new Date(mate.victorianBusinessLicenceExpiry).toISOString().split('T')[0] : '');
    }
  }, [mate]);

  if (!mate) return null;

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      router.push('/dashboard/mate');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
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
        toast.success('Photo updated!');
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'id' | 'bgCheck' | 'firstAid' | 'whiteCard' | 'childrenCheck' | 'victorianBusinessLicence') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingMap: Record<string, (v: boolean) => void> = {
      license: setIsUploadingLicense,
      id: setIsUploadingId,
      firstAid: setIsUploadingFirstAid,
      whiteCard: setIsUploadingWhiteCard,
      childrenCheck: setIsUploadingChildrenCheck,
      victorianBusinessLicence: setIsUploadingVictorianLicence,
    };

    const apiTypeMap: Record<string, 'license' | 'id' | 'companyLicense' | 'firstAid' | 'whiteCard' | 'childrenCheck' | 'victorianBusinessLicence'> = {
      license: 'license',
      id: 'id',
      bgCheck: 'id',
      firstAid: 'firstAid',
      whiteCard: 'whiteCard',
      childrenCheck: 'childrenCheck',
      victorianBusinessLicence: 'victorianBusinessLicence',
    };

    const setterMap: Record<string, (v: string) => void> = {
      license: setLocalLicenseDoc,
      id: setLocalIdDoc,
      firstAid: setLocalFirstAidDoc,
      whiteCard: setLocalWhiteCardDoc,
      childrenCheck: setLocalChildrenCheckDoc,
      victorianBusinessLicence: setLocalVictorianLicenceDoc,
    };

    loadingMap[type]?.(true);
    try {
      const resp = await uploadDocument(file, apiTypeMap[type]);
      if (resp.success && resp.data?.url) {
        setterMap[type]?.(resp.data.url);
        toast.success('Document uploaded!');
        setHasUnsavedChanges(true);
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      loadingMap[type]?.(false);
    }
  };

  const handleVerifyABN = async () => {
    if (!abnInput.trim()) {
      toast.error('Please enter your ABN');
      return;
    }
    if (!abnState) {
      toast.error('Please select your operating state');
      return;
    }

    setIsVerifyingABN(true);
    try {
      const resp = await verifyABN(abnInput, abnState);
      if (resp.success && resp.data) {
        toast.success(resp.message || 'ABN verified successfully!');
        await fetchUser();
        setAbnInput('');
        setAbnState('');
      } else {
        toast.error(resp.message || 'ABN verification failed');
      }
    } catch (err) {
      toast.error('Failed to verify ABN. Please try again.');
    } finally {
      setIsVerifyingABN(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: if checkbox is checked but no document uploaded
    if (worksOnConstructionSite && !localWhiteCardDoc && !mate.constructionWhiteCard) {
      toast.error('Please upload your Construction White Card document.');
      return;
    }
    if (worksWithChildren && !localChildrenCheckDoc && !mate.workingWithChildrenCheck) {
      toast.error('Please upload your Working With Children Check document.');
      return;
    }
    if (mate.abnState === AustralianState.VIC && !localVictorianLicenceDoc && !mate.victorianBusinessLicence) {
      toast.error('Victorian law requires you to upload your Private Security Business Licence.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<MateProfileUpdatePayload> = {
        ...formData,
        idExpiry: formData.idExpiry ? new Date(formData.idExpiry).toISOString() : null,
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : null,
        licenseDocument: localLicenseDoc || mate.licenseDocument || undefined,
        idDocument: localIdDoc || mate.idDocument || undefined,
        firstAidCertificate: localFirstAidDoc || mate.firstAidCertificate || undefined,
        firstAidCertificateExpiry: firstAidExpiry ? new Date(firstAidExpiry).toISOString() : undefined,
        worksOnConstructionSite,
        constructionWhiteCard: worksOnConstructionSite ? (localWhiteCardDoc || mate.constructionWhiteCard || undefined) : undefined,
        constructionWhiteCardExpiry: worksOnConstructionSite && whiteCardExpiry ? new Date(whiteCardExpiry).toISOString() : undefined,
        worksWithChildren,
        workingWithChildrenCheck: worksWithChildren ? (localChildrenCheckDoc || mate.workingWithChildrenCheck || undefined) : undefined,
        workingWithChildrenCheckExpiry: worksWithChildren && childrenCheckExpiry ? new Date(childrenCheckExpiry).toISOString() : undefined,
        victorianBusinessLicence: localVictorianLicenceDoc || mate.victorianBusinessLicence || undefined,
        victorianBusinessLicenceExpiry: victorianLicenceExpiry ? new Date(victorianLicenceExpiry).toISOString() : undefined,
        certifications: mate.certifications,
        isOnboardingComplete: true,
        isProfileComplete: !!(formData.firstName && formData.lastName && formData.bio && formData.phone && formData.address),
      };
      await updateUserProfile(payload);
      await fetchUser();
      setHasUnsavedChanges(false);
      toast.success('Profile saved!');
      router.push('/dashboard/mate');
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = `${formData.firstName} ${formData.lastName}`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Card */}
          <Card className="p-0 overflow-hidden border-none shadow-xl ring-1 ring-[var(--color-border-primary)]">
            {/* Banner containing Avatar and Info */}
            <div className="w-full bg-gradient-to-r from-[var(--color-primary)] to-indigo-700 px-5 sm:px-6 py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              <div className="relative group shrink-0">
                <Avatar
                  src={mate?.profilePhoto}
                  name={displayName}
                  size="xl"
                  className="ring-4 ring-white/20 shadow-xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-1.5 bg-white text-[var(--color-primary)] rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1.5 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">{displayName}</h1>
                <p className="text-[10px] sm:text-[11px] font-bold text-white/90 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                  <Shield className="h-3.5 w-3.5 text-white/90 shrink-0" />
                  Professional Security Mate
                </p>
              </div>
            </div>

            {/* Actions Bar (Below Banner) */}
            <div className="px-5 sm:px-6 py-3 bg-[var(--color-bg-primary)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <CertificateBadges user={mate} size="sm" />
                  <div className="h-4 w-px bg-[var(--color-border-primary)] hidden sm:block" />
                  <Toggle
                    size="sm"
                    label="Available"
                    checked={formData.isAvailable}
                    onCheckedChange={(v) => handleChange('isAvailable', v)}
                  />
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGoBack}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSaving}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
              <Card padding="md">
                <SectionHeader icon={<User className="h-4 w-4" />} title="Personal Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  <Input label="First Name" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
                  <Input label="Last Name" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
                  <PhoneInput
                    label="Phone Number"
                    value={formData.phone}
                    defaultCountry={formData.phoneCountryCode as any}
                    onChange={(v: string) => { setFormData(prev => ({ ...prev, phone: v })); setHasUnsavedChanges(true); }}
                  />
                </div>
                <div className="mt-3">
                  <Input label="Street Address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="House #, Street" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                  <Input label="City" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} />
                  <Input label="State/Region" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} />
                  <Input label="Postal Code" value={formData.postalCode} onChange={(e) => handleChange('postalCode', e.target.value)} />
                  <Input label="Country" value={formData.country} onChange={(e) => handleChange('country', e.target.value)} />
                </div>
                <div className="mt-3">
                  <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Short Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full min-h-[80px] p-2.5 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none resize-none"
                  />
                </div>
              </Card>

              <Card padding="md">
                <SectionHeader icon={<Briefcase className="h-4 w-4" />} title="Professional Basics" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <Input label="Experience (Years)" type="number" value={formData.experience} onChange={(e) => handleChange('experience', parseInt(e.target.value) || 0)} />
                  <Input label="Hourly Rate ($)" type="number" value={formData.hourlyRate} onChange={(e) => handleChange('hourlyRate', parseInt(e.target.value) || 0)} />
                  <Input label="Work Radius (km)" type="number" value={formData.preferredWorkRadius} onChange={(e) => handleChange('preferredWorkRadius', parseInt(e.target.value) || 0)} />
                  <Input label="Min Hours Per Shift" type="number" value={formData.minimumHours} onChange={(e) => handleChange('minimumHours', parseInt(e.target.value) || 0)} />
                </div>
              </Card>

              {/* Skills & Languages — Combined for better vertical balance */}
              <Card padding="md">
                <SectionHeader icon={<Star className="h-4 w-4" />} title="Skills & Languages" />
                
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Skills Tag Input */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-2">My Skills</label>
                    <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 min-h-[46px]">
                      {formData.skills.map(skill => (
                        <Badge key={skill} variant="neutral" className="pl-2 pr-1.5 py-1 flex items-center gap-1.5 text-xs bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)]">
                          {skill}
                          <button type="button" onClick={() => handleChange('skills', formData.skills.filter(s => s !== skill))} className="p-0.5 hover:bg-black/10 rounded-full transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        type="text"
                        placeholder="Type skill & press Enter..."
                        className="flex-1 text-sm bg-transparent border-none outline-none min-w-[140px] px-1 py-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !formData.skills.includes(val)) {
                              handleChange('skills', [...formData.skills, val]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Languages Tag Input */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-2">Languages Spoken</label>
                    <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 min-h-[46px]">
                      {(formData.languages || []).map(lang => (
                        <Badge key={lang} variant="neutral" className="pl-2 pr-1.5 py-1 flex items-center gap-1.5 text-xs bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)]">
                          {lang}
                          <button type="button" onClick={() => handleChange('languages', formData.languages.filter(l => l !== lang))} className="p-0.5 hover:bg-black/10 rounded-full transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        type="text"
                        placeholder="Type language & press Enter..."
                        className="flex-1 text-sm bg-transparent border-none outline-none min-w-[140px] px-1 py-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !formData.languages.includes(val)) {
                              handleChange('languages', [...(formData.languages || []), val]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
              <Card padding="md">
                <SectionHeader icon={<FileText className="h-4 w-4" />} title="Verification Documents" />
                <div className="mt-4 space-y-4">
                  {/* Security License Section */}
                  <div className="p-3 rounded-xl bg-[var(--color-bg-secondary)]/50 space-y-3">
                    <DocUploadRow label="Security License" url={localLicenseDoc || mate.licenseDocument} isUploading={isUploadingLicense} onUpload={() => licenseFileRef.current?.click()} status={mate.licenseStatus} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input label="License #" value={formData.licenseNumber} onChange={(e) => handleChange('licenseNumber', e.target.value)} />
                      <Input label="License Type" value={formData.licenseType} onChange={(e) => handleChange('licenseType', e.target.value)} placeholder="e.g. SIA Door Supervisor" />
                      <Input label="License Expiry" type="date" value={formData.licenseExpiry} onChange={(e) => handleChange('licenseExpiry', e.target.value)} />
                    </div>
                  </div>

                  {/* Government ID Section */}
                  <div className="p-3 rounded-xl bg-[var(--color-bg-secondary)]/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DocUploadRow label="Government ID" url={localIdDoc || mate.idDocument} isUploading={isUploadingId} onUpload={() => idFileRef.current?.click()} status={mate.idVerificationStatus} />
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Expiry Date</label>
                        <input
                          type="date"
                          value={formData.idExpiry}
                          onChange={(e) => handleChange('idExpiry', e.target.value)}
                          className="w-full flex-1 px-3 py-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <input type="file" ref={licenseFileRef} className="hidden" onChange={(e) => handleDocUpload(e, 'license')} />
                <input type="file" ref={idFileRef} className="hidden" onChange={(e) => handleDocUpload(e, 'id')} />
              </Card>

              {/* ── Certifications & Licences ──────────────────────────── */}
              <Card padding="md">
                <SectionHeader icon={<Heart className="h-4 w-4" />} title="Certifications & Licences" />

                {/* First Aid — Always Visible, Mandatory */}
                <div className="mt-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                        <Heart className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">First Aid Certificate</p>
                        <p className="text-[9px] text-[var(--color-text-tertiary)] font-medium">Mandatory for all guards</p>
                      </div>
                    </div>
                    {mate.firstAidCertificateStatus && (
                      <CertStatusBadge status={mate.firstAidCertificateStatus} />
                    )}
                  </div>

                  {!(localFirstAidDoc || mate.firstAidCertificate) && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-[10px] font-bold text-red-500">First Aid Certificate is mandatory for all guards</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <DocUploadRow label="Certificate Document" url={localFirstAidDoc || mate.firstAidCertificate} isUploading={isUploadingFirstAid} onUpload={() => firstAidFileRef.current?.click()} status={mate.firstAidCertificateStatus} />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Expiry Date</label>
                      <input
                        type="date"
                        value={firstAidExpiry}
                        onChange={(e) => { setFirstAidExpiry(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-full flex-1 px-3 py-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none"
                      />
                    </div>
                  </div>

                  {(localFirstAidDoc || mate.firstAidCertificate) && (
                    <a href={localFirstAidDoc || mate.firstAidCertificate || '#'} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                      <FileText className="h-3 w-3" /> View Document
                    </a>
                  )}
                </div>
                <input type="file" ref={firstAidFileRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocUpload(e, 'firstAid')} />

                {/* Construction White Card Checkbox */}
                <div className="mt-4">
                  <Checkbox
                    label="I work on Construction Sites"
                    checked={worksOnConstructionSite}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (!checked && (localWhiteCardDoc || mate.constructionWhiteCard)) {
                        setShowClearWhiteCardDialog(true);
                      } else {
                        setWorksOnConstructionSite(checked);
                        setHasUnsavedChanges(true);
                      }
                    }}
                  />
                </div>

                {worksOnConstructionSite && (
                  <div className="mt-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <HardHat className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Construction White Card (CSCS)</p>
                      </div>
                      {mate.constructionWhiteCardStatus && (
                        <CertStatusBadge status={mate.constructionWhiteCardStatus} />
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <DocUploadRow label="White Card Document" url={localWhiteCardDoc || mate.constructionWhiteCard} isUploading={isUploadingWhiteCard} onUpload={() => whiteCardFileRef.current?.click()} status={mate.constructionWhiteCardStatus} />
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Expiry Date</label>
                        <input type="date" value={whiteCardExpiry} onChange={(e) => { setWhiteCardExpiry(e.target.value); setHasUnsavedChanges(true); }} className="w-full flex-1 px-3 py-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none" />
                      </div>
                    </div>
                    {(localWhiteCardDoc || mate.constructionWhiteCard) && (
                      <a href={localWhiteCardDoc || mate.constructionWhiteCard || '#'} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        <FileText className="h-3 w-3" /> View Document
                      </a>
                    )}
                  </div>
                )}
                <input type="file" ref={whiteCardFileRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocUpload(e, 'whiteCard')} />

                {/* Working With Children Checkbox */}
                <div className="mt-4">
                  <Checkbox
                    label="I work in Schools or Hospitals (with children)"
                    checked={worksWithChildren}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (!checked && (localChildrenCheckDoc || mate.workingWithChildrenCheck)) {
                        setShowClearChildrenCheckDialog(true);
                      } else {
                        setWorksWithChildren(checked);
                        setHasUnsavedChanges(true);
                      }
                    }}
                  />
                </div>

                {worksWithChildren && (
                  <div className="mt-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                        <Star className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Working With Children Check (DBS Enhanced)</p>
                      </div>
                      {mate.workingWithChildrenCheckStatus && (
                        <CertStatusBadge status={mate.workingWithChildrenCheckStatus} />
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <DocUploadRow label="DBS Certificate" url={localChildrenCheckDoc || mate.workingWithChildrenCheck} isUploading={isUploadingChildrenCheck} onUpload={() => childrenCheckFileRef.current?.click()} status={mate.workingWithChildrenCheckStatus} />
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Expiry Date</label>
                        <input type="date" value={childrenCheckExpiry} onChange={(e) => { setChildrenCheckExpiry(e.target.value); setHasUnsavedChanges(true); }} className="w-full flex-1 px-3 py-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none" />
                      </div>
                    </div>
                    {(localChildrenCheckDoc || mate.workingWithChildrenCheck) && (
                      <a href={localChildrenCheckDoc || mate.workingWithChildrenCheck || '#'} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        <FileText className="h-3 w-3" /> View Document
                      </a>
                    )}
                  </div>
                )}
                <input type="file" ref={childrenCheckFileRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocUpload(e, 'childrenCheck')} />

                {/* Victorian Private Security Business Licence */}
                {(mate.abnState === AustralianState.VIC || mate.victorianBusinessLicence) && (
                  <div className="mt-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Private Security Business Licence (Victoria)</p>
                      </div>
                      {mate.victorianBusinessLicenceStatus && (
                        <CertStatusBadge status={mate.victorianBusinessLicenceStatus} />
                      )}
                    </div>

                    {mate.abnState === AustralianState.VIC && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                        <p className="text-[10px] font-bold text-blue-500">Victorian law requires security contractors to hold a Private Security Business Licence (effective 19 December 2025). Upload yours for admin verification.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <DocUploadRow label="Licence Document" url={localVictorianLicenceDoc || mate.victorianBusinessLicence} isUploading={isUploadingVictorianLicence} onUpload={() => victorianLicenceFileRef.current?.click()} status={mate.victorianBusinessLicenceStatus} />
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">Expiry Date</label>
                        <input type="date" value={victorianLicenceExpiry} onChange={(e) => { setVictorianLicenceExpiry(e.target.value); setHasUnsavedChanges(true); }} className="w-full flex-1 px-3 py-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none" />
                      </div>
                    </div>
                    {localVictorianLicenceDoc || mate.victorianBusinessLicence ? (
                      <a href={localVictorianLicenceDoc || mate.victorianBusinessLicence || '#'} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        <FileText className="h-3 w-3" /> View Document
                      </a>
                    ) : null}
                  </div>
                )}
                <input type="file" ref={victorianLicenceFileRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocUpload(e, 'victorianBusinessLicence')} />
              </Card>

              {/* ── ABN & Business Details ──────────────────────────── */}
              <Card padding="md">
                <SectionHeader icon={<Building2 className="h-4 w-4" />} title="ABN & Business Details" />
                
                <div className="mt-4 space-y-4">
                  {/* Info Box */}
                  <div className="p-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Guards with a verified ABN can propose their own rates when bidding on jobs. Without ABN you can only apply for jobs at the posted rate.
                    </p>
                  </div>

                  {/* Legal Disclaimer */}
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      By providing your ABN you confirm you hold all required licences to operate as a security contractor in your state. GuardMate verifies ABN existence only and is not responsible for your licence compliance.
                    </p>
                  </div>

                  {/* Victorian Law Notice */}
                  {mate.abnState === AustralianState.VIC && (
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          Note: From June 2026 Victoria requires security contractors to hold both an Individual Security Licence and a Private Security Business Licence in addition to ABN.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ABN Status Display */}
                  {mate.abnStatus && mate.abnStatus !== ABNStatus.NOT_PROVIDED && (
                    <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${
                            mate.abnVerified ? 'bg-emerald-500/10 text-emerald-500' : 
                            mate.abnStatus === ABNStatus.PENDING_VERIFICATION ? 'bg-amber-500/10 text-amber-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Australian Business Number</p>
                            <p className="text-[9px] text-[var(--color-text-tertiary)]">
                              {mate.abn ? `${mate.abn.slice(0, 2)} ${mate.abn.slice(2, 5)} ${mate.abn.slice(5, 8)} ${mate.abn.slice(8)}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            mate.abnVerified ? 'success' : 
                            mate.abnStatus === ABNStatus.PENDING_VERIFICATION ? 'warning' :
                            'danger'
                          } 
                          className="text-[9px] h-5 py-0"
                        >
                          {mate.abnVerified ? 'Verified' : mate.abnStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {mate.abnBusinessName && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--color-text-tertiary)]">Business:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">{mate.abnBusinessName}</span>
                        </div>
                      )}

                      {mate.abnVerifiedAt && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--color-text-tertiary)]">Verified:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {new Date(mate.abnVerifiedAt).toLocaleDateString('en-AU')}
                          </span>
                        </div>
                      )}

                      {mate.abnGstRegistered !== null && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--color-text-tertiary)]">GST Registered:</span>
                          <Badge variant={mate.abnGstRegistered ? 'success' : 'neutral'} className="text-[9px] h-4 py-0">
                            {mate.abnGstRegistered ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      )}

                      {mate.abnState && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--color-text-tertiary)]">Operating State:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {AustralianStateNames[mate.abnState]}
                          </span>
                        </div>
                      )}

                      {/* Re-verify button for verified/pending */}
                      {(mate.abnVerified || mate.abnStatus === ABNStatus.PENDING_VERIFICATION || mate.abnStatus === ABNStatus.INVALID || mate.abnStatus === ABNStatus.CANCELLED) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            setAbnInput(mate.abn || '');
                            setAbnState(mate.abnState || '');
                          }}
                        >
                          Re-verify ABN
                        </Button>
                      )}
                    </div>
                  )}

                  {/* ABN Input Form */}
                  {(!mate.abnVerified || abnInput) && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">
                          ABN Number (11 digits)
                        </label>
                        <Input
                          type="text"
                          value={abnInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setAbnInput(val);
                          }}
                          placeholder="Enter 11 digit ABN"
                          maxLength={11}
                        />
                        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                          Format: XX XXX XXX XXX (stored without spaces)
                        </p>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">
                          Operating State
                        </label>
                        <select
                          value={abnState}
                          onChange={(e) => setAbnState(e.target.value as AustralianState)}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-primary)] transition-all outline-none"
                        >
                          <option value="">Select State/Territory</option>
                          {Object.values(AustralianState).map((state) => (
                            <option key={state} value={state}>
                              {AustralianStateNames[state]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        className="w-full"
                        loading={isVerifyingABN}
                        onClick={handleVerifyABN}
                        leftIcon={mate.abnVerified ? <CheckCircle2 className="h-4 w-4" /> : undefined}
                      >
                        {mate.abnVerified ? 'Re-verify ABN' : 'Verify ABN'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setHasUnsavedChanges(false);
          router.push('/dashboard/mate');
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave?"
        confirmLabel="Leave"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showClearWhiteCardDialog}
        onCancel={() => setShowClearWhiteCardDialog(false)}
        onConfirm={() => {
          setWorksOnConstructionSite(false);
          setLocalWhiteCardDoc(undefined);
          setWhiteCardExpiry('');
          setHasUnsavedChanges(true);
          setShowClearWhiteCardDialog(false);
        }}
        title="Remove White Card"
        message="This will remove your White Card information. Are you sure?"
        confirmLabel="Remove"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showClearChildrenCheckDialog}
        onCancel={() => setShowClearChildrenCheckDialog(false)}
        onConfirm={() => {
          setWorksWithChildren(false);
          setLocalChildrenCheckDoc(undefined);
          setChildrenCheckExpiry('');
          setHasUnsavedChanges(true);
          setShowClearChildrenCheckDialog(false);
        }}
        title="Remove Children Check"
        message="This will remove your Working With Children Check information. Are you sure?"
        confirmLabel="Remove"
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

function DocUploadRow({ label, url, isUploading, onUpload, status }: { label: string; url: string | null | undefined; isUploading: boolean; onUpload: () => void; status: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${url ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-bold leading-none">{label}</p>
          <div className="mt-1">
            {url ? (
              <Badge variant={status === 'VERIFIED' || status === 'VALID' ? 'success' : 'warning'} className="text-[9px] h-4 py-0 font-bold uppercase">
                {status || 'PENDING'}
              </Badge>
            ) : (
              <span className="text-[9px] text-[var(--color-text-tertiary)] font-bold uppercase opacity-60">Missing</span>
            )}
          </div>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="h-8 px-2 border-dashed" loading={isUploading} onClick={onUpload}>
        {url ? 'Replace' : 'Upload'}
      </Button>
    </div>
  );
}

function CertStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
    VALID: { variant: 'success', label: 'Valid' },
    PENDING_REVIEW: { variant: 'warning', label: 'Pending Review' },
    REJECTED: { variant: 'danger', label: 'Rejected' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
  };
  const d = map[status] || { variant: 'warning' as const, label: status };
  return <Badge variant={d.variant} className="text-[9px] h-4 py-0 font-bold uppercase ml-auto">{d.label}</Badge>;
}