'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getUserProfile, updateUserStatus, promoteToAdmin, updateVerificationStatus } from '@/lib/api/admin.api';
import type { UserProfile, MateProfile, BossProfile, AdminProfile, LoginHistoryEntry } from '@/types/user.types';
import { UserRole, UserStatus, LicenseStatus, VerificationStatus } from '@/types/enums';
import {
  User,
  Briefcase,
  Shield,
  History,
  Settings,
  CheckCircle2,
  XCircle,
  Ban,
  Crown,
  RefreshCw,
  Globe,
  Monitor,
  Clock,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Tab Definition ───────────────────────────────────────────────────────────

const tabs = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'security', label: 'Security & License', icon: Shield },
  { id: 'activity', label: 'Login History', icon: History },
  { id: 'account', label: 'Account Status', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserProfileModalProps {
  uid: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    PENDING: { variant: 'warning', label: 'Pending' },
    SUSPENDED: { variant: 'info', label: 'Suspended' },
    BANNED: { variant: 'danger', label: 'Banned' },
  };
  const d = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={d.variant} size="sm">{d.label}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { variant: 'mate' | 'boss' | 'admin'; label: string }> = {
    MATE: { variant: 'mate', label: 'Guard' },
    BOSS: { variant: 'boss', label: 'Boss' },
    ADMIN: { variant: 'admin', label: 'Admin' },
  };
  const d = map[role] || { variant: 'mate' as const, label: role };
  return <Badge variant={d.variant} size="sm">{d.label}</Badge>;
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function Field({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-[var(--color-text-muted)] mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
        <p className="text-sm text-[var(--color-text-primary)] mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

// ─── License Expiry Badge ─────────────────────────────────────────────────────

function LicenseExpiryBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span className="text-xs text-[var(--color-text-muted)]">N/A</span>;
  const d = new Date(expiry);
  const days = Math.ceil((d.getTime() - Date.now()) / (86400000));
  if (days < 0) return <Badge variant="danger" size="sm" dot>Expired</Badge>;
  if (days <= 30) return <Badge variant="warning" size="sm" dot>Expiring ({days}d)</Badge>;
  return <Badge variant="success" size="sm">{d.toLocaleDateString()}</Badge>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UserProfileModal({ uid, isOpen, onClose, onStatusChanged }: UserProfileModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [actionLoading, setActionLoading] = useState(false);
  const [promoteConfirm, setPromoteConfirm] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ action: 'reject' | 'suspend' } | null>(null);
  const [reason, setReason] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');

  const fetchUser = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const resp = await getUserProfile(uid);
      if (resp.success) setUser(resp.data);
    } catch {
      toast.error('Failed to load user profile.');
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (isOpen && uid) {
      setActiveTab('personal');
      fetchUser();
    }
    if (!isOpen) {
      setUser(null);
    }
  }, [isOpen, uid, fetchUser]);

  // ── Status Actions ────────────────────────────────────────
  const handleApprove = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const resp = await updateUserStatus(user.uid, UserStatus.ACTIVE);
      if (resp.success) {
        toast.success('User approved!');
        fetchUser();
        onStatusChanged?.();
      }
    } catch { toast.error('Failed to approve.'); }
    finally { setActionLoading(false); }
  };

  const handleRejectSubmit = async () => {
    if (!user || !rejectDialog || !reason.trim()) return;
    setActionLoading(true);
    try {
      const status = rejectDialog.action === 'reject' ? UserStatus.BANNED : UserStatus.SUSPENDED;
      const resp = await updateUserStatus(user.uid, status, reason);
      if (resp.success) {
        toast.success(`User ${rejectDialog.action === 'reject' ? 'rejected' : 'suspended'}.`);
        setRejectDialog(null);
        setReason('');
        fetchUser();
        onStatusChanged?.();
      }
    } catch { toast.error('Action failed.'); }
    finally { setActionLoading(false); }
  };

  const handleRestore = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const resp = await updateUserStatus(user.uid, UserStatus.ACTIVE, 'Restored by admin');
      if (resp.success) {
        toast.success('User restored!');
        fetchUser();
        onStatusChanged?.();
      }
    } catch { toast.error('Failed to restore.'); }
    finally { setActionLoading(false); }
  };

  const handlePromote = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const resp = await promoteToAdmin(user.uid);
      if (resp.success) {
        toast.success('User promoted to Admin!');
        setPromoteConfirm(false);
        fetchUser();
        onStatusChanged?.();
      }
    } catch { toast.error('Promotion failed.'); }
    finally { setActionLoading(false); }
  };

  // ── Tab Content ───────────────────────────────────────────
  const renderTabContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'personal':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <Field icon={User} label="Full Name" value={user.fullName} />
            <Field icon={Mail} label="Email" value={<>{user.email} {user.emailVerified && <Badge variant="success" size="sm">Verified</Badge>}</>} />
            <Field icon={Phone} label="Phone" value={user.phone ? `${user.phoneCountryCode || ''} ${user.phone}` : null} />
            <Field icon={MapPin} label="Location" value={[user.city, user.state, user.country].filter(Boolean).join(', ') || null} />
            <Field icon={Globe} label="Timezone" value={user.timezone} />
            <Field icon={Calendar} label="Registered" value={new Date(user.createdAt).toLocaleString()} />
            <Field label="Auth Provider" value={user.authProvider} />
            {user.bio && <div className="sm:col-span-2"><Field label="Bio" value={user.bio} /></div>}
          </div>
        );

      case 'professional':
        if (user.role === UserRole.MATE) {
          const m = user as MateProfile;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <Field icon={Briefcase} label="Hourly Rate" value={m.hourlyRate ? `$${m.hourlyRate}/hr` : null} />
              <Field label="Experience" value={m.experience ? `${m.experience} years` : null} />
              <Field label="Min Hours" value={m.minimumHours ? `${m.minimumHours}h` : null} />
              <Field label="Work Radius" value={m.preferredWorkRadius ? `${m.preferredWorkRadius} km` : null} />
              <Field label="Languages" value={(m.languages || []).join(', ') || null} />
              <Field label="Available" value={m.isAvailable ? 'Yes' : 'No'} />
              <div className="sm:col-span-2">
                <Field label="Skills" value={
                  (m.skills || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {m.skills.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-surface-border)]">{s}</span>
                      ))}
                    </div>
                  ) : null
                } />
              </div>
              <Field icon={Star} label="Rating" value={m.averageRating ? `${m.averageRating.toFixed(1)} (${m.totalReviews} reviews)` : 'No reviews'} />
              <Field label="Jobs Completed" value={m.totalJobsCompleted} />
              <Field label="Total Earnings" value={`$${(m.totalEarnings || 0).toLocaleString()}`} />
              <Field label="Completion Rate" value={m.completionRate ? `${m.completionRate}%` : null} />
              {m.certifications && m.certifications.length > 0 && (
                <div className="sm:col-span-2 mt-2">
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Certifications</p>
                  <div className="space-y-2">
                    {m.certifications.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                        <span className="font-medium text-[var(--color-text-primary)]">{c.name}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{c.issuingBody}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }
        if (user.role === UserRole.BOSS) {
          const b = user as BossProfile;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <Field icon={Briefcase} label="Company" value={b.companyName} />
              <Field label="Industry" value={b.industry} />
              <Field label="Registration #" value={b.companyRegistrationNumber} />
              <Field icon={Mail} label="Company Email" value={b.companyEmail} />
              <Field icon={Phone} label="Company Phone" value={b.companyPhone} />
              <Field icon={Globe} label="Website" value={b.companyWebsite} />
              <Field icon={MapPin} label="Company Location" value={[b.companyAddress, b.companyCity, b.companyState, b.companyCountry].filter(Boolean).join(', ') || null} />
              <Field label="Verified" value={b.isCompanyVerified ? 'Yes' : 'No'} />
              <Field icon={Star} label="Rating" value={b.averageRating ? `${b.averageRating.toFixed(1)} (${b.totalReviews} reviews)` : 'No reviews'} />
              <Field label="Jobs Posted" value={b.totalJobsPosted} />
              <Field label="Active Jobs" value={b.activeJobsCount} />
              <Field label="Total Spent" value={`$${(b.totalSpent || 0).toLocaleString()}`} />
              <Field label="Subscription" value={b.subscriptionPlan || 'None'} />
              {b.companyDescription && <div className="sm:col-span-2"><Field label="Description" value={b.companyDescription} /></div>}
            </div>
          );
        }
        if (user.role === UserRole.ADMIN) {
          const a = user as AdminProfile;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <Field label="Admin Level" value={a.adminLevel} />
              <Field label="Assigned By" value={a.assignedBy || 'System'} />
              <Field label="Last Action" value={a.lastActionAt ? new Date(a.lastActionAt).toLocaleString() : 'Never'} />
              <Field label="Managed Regions" value={(a.managedRegions || []).join(', ') || 'All'} />
              <div className="sm:col-span-2">
                <Field label="Permissions" value={
                  (a.permissions || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {a.permissions.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-role-admin-light)] text-[var(--color-role-admin)] font-medium">{p.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  ) : 'None'
                } />
              </div>
            </div>
          );
        }
        return <p className="text-sm text-[var(--color-text-muted)]">No professional info available.</p>;

      case 'security':
        if (user.role === UserRole.MATE) {
          const m = user as MateProfile;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <Field icon={Shield} label="License Number" value={m.licenseNumber} />
                <Field label="License Type" value={m.licenseType} />
                <Field label="Issuing Authority" value={m.licenseIssuingAuthority} />
                <Field label="Issued Date" value={m.licenseIssuedAt ? new Date(m.licenseIssuedAt).toLocaleDateString() : null} />
                <Field label="License Expiry" value={<LicenseExpiryBadge expiry={m.licenseExpiry} />} />
                <Field label="License Status" value={m.licenseStatus} />
                {m.licenseDocument && (
                  <Field icon={FileText} label="License Document" value={
                    <a href={m.licenseDocument} target="_blank" rel="noopener noreferrer" className="text-[var(--color-link)] hover:text-[var(--color-link-hover)] text-sm font-medium">View Document</a>
                  } />
                )}
              </div>
              <div className="border-t border-[var(--color-card-border)] pt-4">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">ID Verification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <Field label="ID Type" value={m.idType} />
                  <Field label="ID Number" value={m.idNumber} />
                  <Field label="Verification Status" value={m.idVerificationStatus} />
                  <Field label="Background Check" value={m.backgroundCheckStatus} />
                  {m.idDocument && (
                    <Field icon={FileText} label="ID Document" value={
                      <a href={m.idDocument} target="_blank" rel="noopener noreferrer" className="text-[var(--color-link)] hover:text-[var(--color-link-hover)] text-sm font-medium">View Document</a>
                    } />
                  )}
                </div>
              </div>

              {/* Admin Verification Controls */}
              <div className="border-t border-[var(--color-card-border)] pt-4">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Admin Verification Actions</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">License Status</label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                        defaultValue={m.licenseStatus}
                        onChange={async (e) => {
                          setVerifyLoading(true);
                          try {
                            const resp = await updateVerificationStatus(user.uid, 'licenseStatus', e.target.value, verifyNotes || undefined);
                            if (resp.success) { toast.success('License status updated!'); fetchUser(); onStatusChanged?.(); }
                          } catch { toast.error('Failed to update.'); }
                          finally { setVerifyLoading(false); }
                        }}
                        disabled={verifyLoading}
                      >
                        {Object.values(LicenseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">ID Verification Status</label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                        defaultValue={m.idVerificationStatus}
                        onChange={async (e) => {
                          setVerifyLoading(true);
                          try {
                            const resp = await updateVerificationStatus(user.uid, 'idVerificationStatus', e.target.value, verifyNotes || undefined);
                            if (resp.success) { toast.success('ID verification status updated!'); fetchUser(); onStatusChanged?.(); }
                          } catch { toast.error('Failed to update.'); }
                          finally { setVerifyLoading(false); }
                        }}
                        disabled={verifyLoading}
                      >
                        {Object.values(VerificationStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Verification Notes</label>
                    <textarea
                      rows={2}
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="Optional notes about verification decision..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none resize-none placeholder:text-[var(--color-input-placeholder)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }
        if (user.role === UserRole.BOSS) {
          const b = user as BossProfile;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <Field icon={Shield} label="Company License #" value={b.companyLicenseNumber} />
                <Field label="License Expiry" value={<LicenseExpiryBadge expiry={b.companyLicenseExpiry} />} />
                <Field label="License Status" value={b.companyLicenseStatus} />
                <Field label="Company Verified" value={b.isCompanyVerified ? 'Yes' : 'No'} />
                <Field label="Verified At" value={b.companyVerifiedAt ? new Date(b.companyVerifiedAt).toLocaleString() : null} />
                {b.verificationNotes && <div className="sm:col-span-2"><Field label="Verification Notes" value={b.verificationNotes} /></div>}
                {b.companyLicenseDocument && (
                  <Field icon={FileText} label="License Document" value={
                    <a href={b.companyLicenseDocument} target="_blank" rel="noopener noreferrer" className="text-[var(--color-link)] hover:text-[var(--color-link-hover)] text-sm font-medium">View Document</a>
                  } />
                )}
              </div>

              {/* Admin Verification Controls */}
              <div className="border-t border-[var(--color-card-border)] pt-4">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Admin Verification Actions</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Company License Status</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                      defaultValue={b.companyLicenseStatus}
                      onChange={async (e) => {
                        setVerifyLoading(true);
                        try {
                          const resp = await updateVerificationStatus(user.uid, 'companyLicenseStatus', e.target.value, verifyNotes || undefined);
                          if (resp.success) { toast.success('Company license status updated!'); fetchUser(); onStatusChanged?.(); }
                        } catch { toast.error('Failed to update.'); }
                        finally { setVerifyLoading(false); }
                      }}
                      disabled={verifyLoading}
                    >
                      {Object.values(LicenseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Verification Notes</label>
                    <textarea
                      rows={2}
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="Optional notes about verification decision..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none resize-none placeholder:text-[var(--color-input-placeholder)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return <p className="text-sm text-[var(--color-text-muted)]">No security info for this user type.</p>;

      case 'activity':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pb-4 border-b border-[var(--color-card-border)]">
              <Field icon={Clock} label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'} />
              <Field icon={Globe} label="Last Login IP" value={user.lastLoginIp} />
              <Field icon={Monitor} label="Last Login Device" value={user.lastLoginDevice} />
              <Field label="Registration IP" value={user.registrationIp} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Login History (Last 10)</p>
              {(!user.loginHistory || user.loginHistory.length === 0) ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No login history available.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[var(--color-table-border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--color-table-header-bg)]">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase">IP</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Device</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Time</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-table-border)]">
                      {(user.loginHistory as LoginHistoryEntry[]).slice(0, 10).map((entry, i) => (
                        <tr key={i} className="hover:bg-[var(--color-table-row-hover)]">
                          <td className="px-3 py-2 font-mono text-xs text-[var(--color-text-secondary)]">{entry.ip}</td>
                          <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)] max-w-[120px] truncate">{entry.device}</td>
                          <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">{new Date(entry.timestamp).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <Badge variant={entry.success ? 'success' : 'danger'} size="sm">
                              {entry.success ? 'Success' : 'Failed'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-surface-border)]">
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={user.status} />
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>

            {/* Status Change Buttons */}
            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Status Actions</p>
              <div className="flex flex-wrap gap-2">
                {user.status !== UserStatus.ACTIVE && (
                  <Button size="sm" onClick={handleApprove} disabled={actionLoading}
                    className="bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)]">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                )}
                {(user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) && (
                  <Button size="sm" onClick={handleRestore} disabled={actionLoading}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Restore
                  </Button>
                )}
                {user.status !== UserStatus.SUSPENDED && (
                  <Button size="sm" variant="ghost" onClick={() => setRejectDialog({ action: 'suspend' })} disabled={actionLoading}>
                    <Ban className="h-4 w-4 mr-1" /> Suspend
                  </Button>
                )}
                {user.status !== UserStatus.BANNED && (
                  <Button size="sm" variant="danger" onClick={() => setRejectDialog({ action: 'reject' })} disabled={actionLoading}>
                    <XCircle className="h-4 w-4 mr-1" /> Ban
                  </Button>
                )}
                {user.role !== UserRole.ADMIN && user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.BANNED && (
                  <Button size="sm" variant="ghost" onClick={() => setPromoteConfirm(true)} disabled={actionLoading}
                    className="text-[var(--color-role-admin)] hover:bg-[var(--color-role-admin-light)]">
                    <Crown className="h-4 w-4 mr-1" /> Promote to Admin
                  </Button>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="border-t border-[var(--color-card-border)] pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <Field label="Two-Factor Auth" value={user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'} />
                <Field label="Profile Complete" value={user.isProfileComplete ? 'Yes' : 'No'} />
                <Field label="Onboarding Complete" value={user.isOnboardingComplete ? 'Yes' : 'No'} />
                <Field label="Email Verified" value={user.emailVerified ? 'Yes' : 'No'} />
                <Field label="Phone Verified" value={user.phoneVerified ? 'Yes' : 'No'} />
                <Field label="Last Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : null} />
                {user.deletedAt && <Field label="Deleted At" value={new Date(user.deletedAt).toLocaleString()} />}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="User Profile" size="lg">
        {isLoading ? (
          <div className="space-y-4 animate-pulse py-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[var(--color-bg-subtle)]" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-[var(--color-bg-subtle)] rounded w-40" />
                <div className="h-4 bg-[var(--color-bg-subtle)] rounded w-60" />
              </div>
            </div>
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-[var(--color-bg-subtle)] rounded-xl" />)}
          </div>
        ) : !user ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-10 w-10 text-[var(--color-warning)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">User profile could not be loaded.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--color-card-border)]">
              <Avatar src={user.profilePhoto || undefined} name={user.fullName} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] truncate">{user.fullName}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 border-b border-[var(--color-card-border)] -mx-1 px-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {renderTabContent()}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject/Suspend Dialog */}
      <Modal
        isOpen={!!rejectDialog}
        onClose={() => { setRejectDialog(null); setReason(''); }}
        title={rejectDialog?.action === 'reject' ? 'Ban User' : 'Suspend User'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectDialog(null); setReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleRejectSubmit} disabled={actionLoading || !reason.trim()}>
              {rejectDialog?.action === 'reject' ? 'Ban User' : 'Suspend User'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {rejectDialog?.action === 'reject'
              ? 'This will permanently ban the user from the platform.'
              : 'This will temporarily suspend the user\'s account.'}
          </p>
          <div>
            <label className="text-sm font-medium text-[var(--color-input-label)] block mb-1.5">
              Reason <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason..."
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none resize-none placeholder:text-[var(--color-input-placeholder)]"
            />
          </div>
        </div>
      </Modal>

      {/* Promote Confirmation */}
      <ConfirmDialog
        isOpen={promoteConfirm}
        onConfirm={handlePromote}
        onCancel={() => setPromoteConfirm(false)}
        title="Promote to Admin"
        message={`This will irreversibly promote "${user?.fullName}" to Admin role. This action cannot be undone.`}
        confirmLabel="Promote"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}
