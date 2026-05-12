'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Settings, Save, Mail, AlertTriangle, Eye, EyeOff, Send, Shield } from 'lucide-react';
import { emailApi } from '@/lib/api/email.api';
import { settingsApi } from '@/lib/api/settings.api';
import { IEmailSettings, NotificationEventType } from '@/types/email.types';
import type { AdminProfile } from '@/types/user.types';
import { IPlatformSettings, IPlatformCountry } from '@/types/settings.types';
import { countries, Country } from '@/components/ui/PhoneInput';
import { usePlatformContext } from '@/context/PlatformContext';
import { useUser } from '@/context/UserContext';
import { sendAdminInvite, getAdminManagement, AdminManagementData } from '@/lib/api/adminAuth.api';
import { AdminLevel } from '@/types/enums';

export default function AdminSettingsPage() {
  const { refreshSettings } = usePlatformContext();
  const { user: currentUser } = useUser();

  const [activeTab, setActiveTab] = useState<'config' | 'toggles' | 'platform' | 'finance' | 'admin_management'>('config');
  const [settings, setSettings] = useState<IEmailSettings | null>(null);
  
  const [platformSettings, setPlatformSettings] = useState<IPlatformSettings | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('none');
  const [abrGuid, setAbrGuid] = useState<string>('');
  const [abrVerificationEnabled, setAbrVerificationEnabled] = useState<boolean>(false);
  const [platformSaving, setPlatformSaving] = useState(false);

  // Minimum Rate Enforcement State
  const [minimumRateEnforced, setMinimumRateEnforced] = useState<boolean>(false);
  const [minimumHourlyRate, setMinimumHourlyRate] = useState<number | null>(null);
  const [platformCurrency, setPlatformCurrency] = useState<string>('AUD');

  // Phase 6: Payment & Finance State
  const [platformCommissionBoss, setPlatformCommissionBoss] = useState<number>(10);
  const [platformCommissionGuard, setPlatformCommissionGuard] = useState<number>(5);
  const [minimumWithdrawalAmount, setMinimumWithdrawalAmount] = useState<number>(50);
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [stripeSecretKey, setStripeSecretKey] = useState<string>('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState<string>('');
  const [paypalEnabled, setPaypalEnabled] = useState<boolean>(false);
  const [paypalClientId, setPaypalClientId] = useState<string>('');
  const [paypalClientSecret, setPaypalClientSecret] = useState<string>('');
  const [paypalWebhookId, setPaypalWebhookId] = useState<string>('');
  const [paypalMode, setPaypalMode] = useState<'sandbox' | 'live'>('sandbox');

  // Phase 8: Subscription Settings State
  const [bossSubscriptionEnabled, setBossSubscriptionEnabled] = useState<boolean>(false);
  const [bossSubscriptionAmount, setBossSubscriptionAmount] = useState<number | null>(null);

  // Phase 9: Admin Management State
  const [adminManagement, setAdminManagement] = useState<AdminManagementData | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadAllSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'admin_management' && (currentUser as AdminProfile | null)?.adminLevel === AdminLevel.SUPER) {
      loadAdminManagement();
    }
  }, [activeTab, currentUser]);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const [emailData, platformData] = await Promise.all([
        emailApi.getSettings(),
        settingsApi.getPlatformSettings()
      ]);
      setSettings(emailData);
      setPlatformSettings(platformData);
      setSelectedCountryCode(platformData.platformCountry?.countryCode || 'none');
      setAbrGuid(platformData.abrGuid || '');
      setAbrVerificationEnabled(platformData.abrVerificationEnabled ?? false);
      // Load minimum rate enforcement settings
      setMinimumRateEnforced(platformData.minimumRateEnforced ?? false);
      setMinimumHourlyRate(platformData.minimumHourlyRate ?? null);
      setPlatformCurrency(platformData.platformCurrency || 'AUD');

      // Phase 6: Load Payment Settings
      setPlatformCommissionBoss(platformData.platformCommissionBoss ?? 10);
      setPlatformCommissionGuard(platformData.platformCommissionGuard ?? 5);
      setMinimumWithdrawalAmount(platformData.minimumWithdrawalAmount ?? 50);
      setStripeEnabled(platformData.stripeEnabled ?? false);
      setStripePublishableKey(platformData.stripePublishableKey || '');
      setStripeSecretKey(platformData.stripeSecretKey || '');
      setStripeWebhookSecret(platformData.stripeWebhookSecret || '');
      setPaypalEnabled(platformData.paypalEnabled ?? false);
      setPaypalClientId(platformData.paypalClientId || '');
      setPaypalClientSecret(platformData.paypalClientSecret || '');
      setPaypalWebhookId(platformData.paypalWebhookId || '');
      setPaypalMode(platformData.paypalMode || 'sandbox');

      // Phase 8: Load Subscription Settings
      setBossSubscriptionEnabled(platformData.bossSubscriptionEnabled ?? false);
      setBossSubscriptionAmount(platformData.bossSubscriptionAmount ?? null);
      // bossSubscriptionCurrency is hardcoded to AUD
    } catch (err: any) {
      setErrorMsg('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');
      const updated = await emailApi.updateSettings(settings);
      setSettings(updated);
      setSuccessMsg('Email configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTesting(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await emailApi.testSettings();
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Test email failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSavePlatform = async () => {
    try {
      setPlatformSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      // Validation: If minimumRateEnforced is true, hourly rate must be set
      if (minimumRateEnforced) {
        if (minimumHourlyRate === null || minimumHourlyRate === undefined || minimumHourlyRate <= 0) {
          setErrorMsg('Please set the minimum hourly rate before enabling enforcement');
          setPlatformSaving(false);
          return;
        }
      }

      // Validation: If bossSubscriptionEnabled is true, amount must be set
      if (bossSubscriptionEnabled) {
        if (bossSubscriptionAmount === null || bossSubscriptionAmount === undefined || bossSubscriptionAmount <= 0) {
          setErrorMsg('Please set a subscription amount greater than 0 before enabling subscriptions');
          setPlatformSaving(false);
          return;
        }
      }

      const targetCountry = selectedCountryCode === 'none' 
        ? null 
        : countries.find(c => c.code === selectedCountryCode) || null;

      const payload = {
        platformCountry: targetCountry ? {
          countryName: targetCountry.name,
          countryCode: targetCountry.code,
          dialCode: targetCountry.dialCode,
          flag: targetCountry.flag
        } as IPlatformCountry : null,
        abrGuid: abrGuid || undefined,
        abrVerificationEnabled,
        minimumRateEnforced,
        minimumHourlyRate: minimumHourlyRate ?? null,

        // Phase 6: Payment Settings Payload
        platformCommissionBoss,
        platformCommissionGuard,
        minimumWithdrawalAmount,
        stripeEnabled,
        stripePublishableKey,
        stripeSecretKey,
        stripeWebhookSecret,
        paypalEnabled,
        paypalClientId,
        paypalClientSecret,
        paypalWebhookId,
        paypalMode,

        // Phase 8: Subscription Settings
        bossSubscriptionEnabled,
        bossSubscriptionAmount,
        bossSubscriptionCurrency: 'AUD',
      };

      const updated = await settingsApi.updatePlatformSettings(payload);
      setPlatformSettings(updated);
      setSelectedCountryCode(updated.platformCountry?.countryCode || 'none');
      setAbrGuid(updated.abrGuid || '');
      setAbrVerificationEnabled(updated.abrVerificationEnabled ?? false);
      // Update minimum rate fields with server response (includes audit fields)
      setMinimumRateEnforced(updated.minimumRateEnforced ?? false);
      setMinimumHourlyRate(updated.minimumHourlyRate ?? null);

      setPlatformCommissionBoss(updated.platformCommissionBoss ?? 10);
      setPlatformCommissionGuard(updated.platformCommissionGuard ?? 5);
      setMinimumWithdrawalAmount(updated.minimumWithdrawalAmount ?? 50);
      setStripeEnabled(updated.stripeEnabled ?? false);
      setStripePublishableKey(updated.stripePublishableKey || '');
      setStripeSecretKey(updated.stripeSecretKey || '');
      setStripeWebhookSecret(updated.stripeWebhookSecret || '');
      setPaypalEnabled(updated.paypalEnabled ?? false);
      setPaypalClientId(updated.paypalClientId || '');
      setPaypalClientSecret(updated.paypalClientSecret || '');
      setPaypalWebhookId(updated.paypalWebhookId || '');
      setPaypalMode(updated.paypalMode || 'sandbox');

      setBossSubscriptionEnabled(updated.bossSubscriptionEnabled ?? false);
      setBossSubscriptionAmount(updated.bossSubscriptionAmount ?? null);
      // bossSubscriptionCurrency is hardcoded to AUD

      await refreshSettings(); // Sync global context
      
      setSuccessMsg('Platform configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save platform settings');
    } finally {
      setPlatformSaving(false);
    }
  };

  const loadAdminManagement = async () => {
    try {
      setLoadingAdmins(true);
      const resp = await getAdminManagement();
      if (resp.success) {
        setAdminManagement(resp.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin management data');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      setErrorMsg('');
      setSuccessMsg('');
      const resp = await sendAdminInvite(inviteEmail.trim());
      if (resp.success) {
        setSuccessMsg(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        loadAdminManagement();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  if (loading || !settings || !platformSettings) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  const handleToggle = (type: NotificationEventType, value: boolean) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [type]: value,
        },
      };
    });
  };

  const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={type === 'password' && showPassword ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {type === 'password' && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );

  const categories = {
    'Account Notifications': [
      { id: NotificationEventType.NEW_GUARD_SIGNUP, label: 'New Guard Signup', desc: 'Alerts Admin when a new guard registers.' },
      { id: NotificationEventType.NEW_BOSS_SIGNUP, label: 'New Boss Signup', desc: 'Alerts Admin when a new boss registers.' },
      { id: NotificationEventType.ACCOUNT_APPROVED, label: 'Account Approved', desc: 'Sent to Guard/Boss upon approval.' },
      { id: NotificationEventType.ACCOUNT_REJECTED, label: 'Account Rejected', desc: 'Sent to Guard/Boss with reason.' },
      { id: NotificationEventType.ACCOUNT_SUSPENDED, label: 'Account Suspended', desc: 'Sent to Guard/Boss with reason.' },
      { id: NotificationEventType.ACCOUNT_BANNED, label: 'Account Banned', desc: 'Sent to Guard/Boss with reason.' },
      { id: NotificationEventType.PASSWORD_RESET, label: 'Password Reset', desc: 'Sent to requesting user.' },
    ],
    'License Notifications': [
      { id: NotificationEventType.LICENSE_APPROVED, label: 'License Approved', desc: 'Sent to Guard/Boss upon license approval.' },
      { id: NotificationEventType.LICENSE_REJECTED, label: 'License Rejected', desc: 'Sent to Guard/Boss with reason.' },
      { id: NotificationEventType.LICENSE_EXPIRY_30_DAYS, label: 'License Expiry', desc: 'Alerts User and Admin 30 days before expiry.' },
    ],
    'Job Notifications': [
      { id: NotificationEventType.BID_RECEIVED, label: 'Bid Received', desc: 'Alerts Boss when a guard bids on their job.' },
      { id: NotificationEventType.BID_ACCEPTED, label: 'Bid Accepted', desc: 'Alerts Guard that their bid won.' },
      { id: NotificationEventType.BID_REJECTED, label: 'Bid Rejected', desc: 'Alerts Guard that their bid was declined.' },
      { id: NotificationEventType.JOB_CANCELLED_BY_BOSS, label: 'Job Cancelled by Boss', desc: 'Alerts Guard when boss cancels a job they were hired for.' },
      { id: NotificationEventType.GUARD_WITHDREW_BID, label: 'Guard Withdrew Bid', desc: 'Alerts Boss when a hired guard withdraws.' },
      { id: NotificationEventType.JOB_REOPENED_TO_BIDDERS, label: 'Job Reopened', desc: 'Alerts Guards when a job they bid on is reopened.' },
    ],
    'Shift Notifications': [
      { id: NotificationEventType.SHIFT_REMINDER, label: 'Shift Reminder 24h', desc: 'Reminds Boss and Guard 24h before shift.' },
      { id: NotificationEventType.SHIFT_CHECKIN_ALERT, label: 'Shift Check-in', desc: 'Alerts Boss when Guard checks in via GPS.' },
      { id: NotificationEventType.SHIFT_CHECKOUT_ALERT, label: 'Shift Check-out', desc: 'Alerts Boss when Guard checks out.' },
      { id: NotificationEventType.SHIFT_APPROVED, label: 'Shift Approved', desc: 'Alerts Guard when Boss approves their completed shift.' },
    ],
    'Payment Notifications': [
      { id: NotificationEventType.PAYMENT_SENT, label: 'Payment Sent', desc: 'Alerts Guard when a payout is processed.' },
      { id: NotificationEventType.MANUAL_WITHDRAWAL_REQUESTED, label: 'Manual Withdrawal Requested', desc: 'Alerts Admin when a guard requests a manual bank transfer.' },
    ],
    'Dispute Notifications': [
      { id: NotificationEventType.DISPUTE_RAISED, label: 'Dispute Raised', desc: 'Alerts Admin, Boss, and Guard.' },
      { id: NotificationEventType.DISPUTE_RESOLVED, label: 'Dispute Resolved', desc: 'Alerts Boss and Guard with resolution details.' },
    ],
    'Subscription & Offer Notifications': [
      { id: NotificationEventType.SUBSCRIPTION_ACTIVATED, label: 'Subscription Activated', desc: 'Alerts Boss when subscription is activated.' },
      { id: NotificationEventType.SUBSCRIPTION_EXPIRING_SOON, label: 'Subscription Expiring Soon', desc: 'Warns Boss 3 days before subscription expiry.' },
      { id: NotificationEventType.SUBSCRIPTION_LAPSED, label: 'Subscription Lapsed', desc: 'Alerts Boss when subscription expires.' },
      { id: NotificationEventType.SUBSCRIPTION_CANCELLED, label: 'Subscription Cancelled', desc: 'Confirms cancellation to Boss.' },
      { id: NotificationEventType.SUBSCRIPTION_PAYMENT_FAILED, label: 'Subscription Payment Failed', desc: 'Alerts Boss when subscription payment fails.' },
      { id: NotificationEventType.NEW_OFFER_AVAILABLE, label: 'New Offer Available', desc: 'Notifies users about new promotions.' },
    ],
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-600" />
          Email & Notifications Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure SMTP details and toggle specific email events globally.</p>
      </div>

      {!settings.isConfigured && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Email Notifications Disabled</h3>
            <p className="text-sm text-amber-700 mt-1">
              You must configure and save your Gmail SMTP credentials below before the platform will send any emails.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md border border-red-200 text-sm">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md border border-emerald-200 text-sm">{successMsg}</div>
      )}

      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-hide">
        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Email Configuration
        </button>
        <button
          onClick={() => setActiveTab('toggles')}
          className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'toggles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notification Toggles
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'platform' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Platform Config
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'finance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Payments & Finance
        </button>
        {(currentUser as AdminProfile | null)?.adminLevel === AdminLevel.SUPER && (
          <button
            onClick={() => setActiveTab('admin_management')}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'admin_management' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Admin Management
          </button>
        )}
      </div>

      {activeTab === 'config' && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Gmail Address"
                value={settings.gmailUser}
                onChange={(val: string) => setSettings({ ...settings, gmailUser: val })}
                placeholder="notifications@guardmate.com"
              />
              <InputField
                label="Gmail App Password"
                type="password"
                value={settings.gmailAppPassword || ''}
                onChange={(val: string) => setSettings({ ...settings, gmailAppPassword: val })}
                placeholder="16-character App Password"
              />
            </div>
            
            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField
                label="From Name"
                value={settings.fromName}
                onChange={(val: string) => setSettings({ ...settings, fromName: val })}
                placeholder="GuardMate"
              />
              <InputField
                label="From Email (Optional Display)"
                value={settings.fromEmail}
                onChange={(val: string) => setSettings({ ...settings, fromEmail: val })}
                placeholder="no-reply@guardmate.com"
              />
              <InputField
                label="Reply-To (Optional)"
                value={settings.replyTo}
                onChange={(val: string) => setSettings({ ...settings, replyTo: val })}
                placeholder="support@guardmate.com"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} leftIcon={<Save className="h-4 w-4" />} className="w-full sm:w-auto">
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button 
                onClick={handleTestEmail} 
                disabled={testing || !settings.gmailUser} 
                variant="outline"
                className="text-slate-600 border-slate-300 hover:bg-slate-50 w-full sm:w-auto"
                leftIcon={<Send className="h-4 w-4" />}
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'toggles' && (
        <div className="space-y-8">
          <div className="flex justify-end">
             <Button onClick={handleSave} disabled={saving} leftIcon={<Save className="h-4 w-4" />} className="w-full sm:w-auto">
                {saving ? 'Saving...' : 'Save Toggles'}
              </Button>
          </div>
          {Object.entries(categories).map(([category, events]) => (
            <Card key={category} className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                {category}
              </h3>
              <div className="space-y-4">
                {events.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{evt.label}</p>
                      <p className="text-xs text-slate-500">{evt.desc}</p>
                    </div>
                    <Toggle
                      checked={!!settings.notifications[evt.id]}
                      onCheckedChange={(checked) => handleToggle(evt.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'platform' && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Platform Country Lock</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Restrict all phone number inputs platform-wide to a single country. 
                When configured, users will not be able to select different country codes during registration.
              </p>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Restriction Warning</h3>
                <p className="text-sm text-amber-700 mt-1 pb-1">
                  Once set, only phone numbers from this country will be accepted during registration and profile updates. 
                  Existing users with foreign numbers will be unaffected.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-input-label)]">
                Selected Country
              </label>
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              >
                <option value="none">No Restriction (Global Access)</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-6 border-t border-[var(--color-border-primary)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">ABR (Australian Business Register) Configuration</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-4">
                Configure ABN verification settings. Guards with verified ABN can propose custom rates when bidding.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md flex items-start gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">ABR API Access</h3>
                  <p className="text-sm text-blue-700 mt-1 pb-1">
                    Obtain your GUID from <a href="https://abr.business.gov.au/" target="_blank" rel="noopener noreferrer" className="underline">abr.business.gov.au</a>.
                    The GUID is kept server-side and never exposed to the frontend.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable ABN Verification</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      When enabled, guards without verified ABN can only bid at the posted rate
                    </p>
                  </div>
                  <Toggle
                    checked={abrVerificationEnabled}
                    onCheckedChange={setAbrVerificationEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-input-label)]">
                    ABR GUID (Server-side only)
                  </label>
                  <input
                    type="password"
                    value={abrGuid}
                    onChange={(e) => setAbrGuid(e.target.value)}
                    placeholder="Enter your ABR API GUID"
                    className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    This GUID is used for ABN lookups. Never share this publicly.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--color-border-primary)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Minimum Rate Enforcement</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-4">
                Set the minimum hourly rate that all jobs must meet. When enabled, Bosses cannot post jobs below this rate. Fixed-rate jobs automatically require a budget equal to this hourly rate multiplied by the total scheduled hours.
              </p>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] mb-4">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Minimum Rate Enforcement</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    When OFF, all fields below are disabled and no enforcement happens
                  </p>
                </div>
                <Toggle
                  checked={minimumRateEnforced}
                  onCheckedChange={setMinimumRateEnforced}
                />
              </div>

              {/* Rate Inputs */}
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-input-label)]">
                    Minimum Hourly Rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-bold">
                      {platformCurrency}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={minimumHourlyRate ?? ''}
                      onChange={(e) => setMinimumHourlyRate(e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g. 25.15"
                      disabled={!minimumRateEnforced}
                      className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 pl-12 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

              </div>

              {/* Info Box */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md mb-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-1">Australia&apos;s Security Services Industry Award</h3>
                <p className="text-sm text-amber-700">
                  Australia&apos;s Security Services Industry Award (MA000016) sets the minimum rate for security guards at $25.15/hr
                  for full-time/part-time and $31.44/hr for casual workers (effective 1 July 2025). Update these values every 1 July
                  when the Fair Work Commission announces the new annual rate.{' '}
                  <a
                    href="https://www.fairwork.gov.au/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Source: fairwork.gov.au
                  </a>
                </p>
              </div>

              {/* Last Updated Info */}
              <div className="text-sm text-[var(--color-text-muted)] mb-4">
                {platformSettings?.minimumRateLastUpdatedAt ? (
                  <p>
                    Last updated: {new Date(platformSettings.minimumRateLastUpdatedAt).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {platformSettings.minimumRateLastUpdatedBy && (
                      <span> by admin</span>
                    )}
                  </p>
                ) : (
                  <p className="text-[var(--color-text-tertiary)]">
                    Never updated — please set minimum rates before enabling enforcement
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-border-primary)]">
              <Button onClick={handleSavePlatform} disabled={platformSaving} leftIcon={<Save className="h-4 w-4" />}>
                {platformSaving ? 'Saving...' : 'Save Context'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'finance' && (
        <Card className="p-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Payments & Escrow Settings</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 pb-4 border-b border-[var(--color-border-primary)]">
                Configure payment gateways, platform commission rates, and withdrawal minimums. Keys are processed securely backend-side.
              </p>
            </div>

            {/* Commissions */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2 mt-4 text-blue-600">
                Platform Commissions (%)
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)]">Dual-commission model. Boss pays on top of rate. Guard pays out of their rate.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--color-bg-secondary)] p-4 rounded-xl border border-[var(--color-border-primary)]">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--color-input-label)]">Boss Escrow Fee (%)</label>
                  <input
                    type="number"
                    min="0" max="50"
                    value={platformCommissionBoss}
                    onChange={(e) => setPlatformCommissionBoss(Number(e.target.value))}
                    className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">e.g. 10% on a $100 job = Boss pays $110.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--color-input-label)]">Guard Payout Fee (%)</label>
                  <input
                    type="number"
                    min="0" max="50"
                    value={platformCommissionGuard}
                    onChange={(e) => setPlatformCommissionGuard(Number(e.target.value))}
                    className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">e.g. 5% on a $100 job = Guard receives $95.</p>
                </div>
              </div>

              {/* Live Commission Preview */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                <h5 className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Live Preview — {platformCurrency}100 Job
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Boss Pays</p>
                    <p className="text-lg font-black text-indigo-900">{platformCurrency}{(100 + (100 * platformCommissionBoss / 100)).toFixed(2)}</p>
                    <p className="text-[9px] text-slate-400">Job + {platformCommissionBoss}% fee</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-emerald-100">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Guard Receives</p>
                    <p className="text-lg font-black text-emerald-900">{platformCurrency}{(100 - (100 * platformCommissionGuard / 100)).toFixed(2)}</p>
                    <p className="text-[9px] text-slate-400">Job - {platformCommissionGuard}% fee</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Platform Earns</p>
                    <p className="text-lg font-black text-amber-900">{platformCurrency}{((100 * platformCommissionBoss / 100) + (100 * platformCommissionGuard / 100)).toFixed(2)}</p>
                    <p className="text-[9px] text-slate-400">{platformCommissionBoss}% + {platformCommissionGuard}% commission</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawals */}
            <div className="space-y-4 pt-4 border-t border-[var(--color-border-primary)]">
              <h4 className="text-lg font-bold text-[var(--color-text-primary)]">Guard Withdrawals</h4>
              <div className="w-1/2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--color-input-label)]">Minimum Withdrawal Amount ({platformCurrency})</label>
                  <input
                    type="number"
                    min="1"
                    value={minimumWithdrawalAmount}
                    onChange={(e) => setMinimumWithdrawalAmount(Number(e.target.value))}
                    className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Stripe */}
            <div className="space-y-4 pt-6 border-t border-[var(--color-border-primary)]">
              <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <h4 className="text-lg font-bold text-emerald-800">Stripe Integration</h4>
                  <p className="text-sm text-emerald-700">Required for Boss direct card payments.</p>
                </div>
                <Toggle checked={stripeEnabled} onCheckedChange={setStripeEnabled} />
              </div>

              {stripeEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animata-in fade-in slide-in-from-top-2">
                  <InputField
                    label="Stripe Publishable Key"
                    value={stripePublishableKey}
                    onChange={setStripePublishableKey}
                    placeholder="pk_test_..."
                  />
                  <InputField
                    label="Stripe Secret Key"
                    type="password"
                    value={stripeSecretKey}
                    onChange={setStripeSecretKey}
                    placeholder="sk_test_..."
                  />
                  <InputField
                    label="Stripe Webhook Secret"
                    type="password"
                    value={stripeWebhookSecret}
                    onChange={setStripeWebhookSecret}
                    placeholder="whsec_..."
                  />
                </div>
              )}
            </div>

            {/* PayPal */}
            <div className="space-y-4 pt-6 border-t border-[var(--color-border-primary)]">
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div>
                  <h4 className="text-lg font-bold text-blue-800">PayPal Integration</h4>
                  <p className="text-sm text-blue-700">Required for PayPal checkout and email payouts.</p>
                </div>
                <Toggle checked={paypalEnabled} onCheckedChange={setPaypalEnabled} />
              </div>

              {paypalEnabled && (
                <div className="grid grid-cols-1 gap-6 animata-in fade-in slide-in-from-top-2">
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                      <input type="radio" checked={paypalMode === 'sandbox'} onChange={() => setPaypalMode('sandbox')} /> Sandbox Mode
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                      <input type="radio" checked={paypalMode === 'live'} onChange={() => setPaypalMode('live')} /> Live Mode
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="PayPal Client ID"
                      value={paypalClientId}
                      onChange={setPaypalClientId}
                      placeholder="Client ID..."
                    />
                    <InputField
                      label="PayPal Secret"
                      type="password"
                      value={paypalClientSecret}
                      onChange={setPaypalClientSecret}
                      placeholder="Secret..."
                    />
                  </div>
                  <div className="w-1/2">
                    <InputField
                      label="PayPal Webhook ID"
                      type="password"
                      value={paypalWebhookId}
                      onChange={setPaypalWebhookId}
                      placeholder="Webhook ID..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Warning regarding keys */}
            <div className="flex gap-2 items-center text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span>Keys are saved as simple strings temporarily. (Encryption-at-rest integration deferred).</span>
            </div>

            {/* Phase 8: Boss Subscription Settings */}
            <div className="space-y-4 pt-6 border-t border-[var(--color-border-primary)]">
              <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div>
                  <h4 className="text-lg font-bold text-purple-800">Boss Monthly Subscription</h4>
                  <p className="text-sm text-purple-700">Require Bosses to maintain a monthly subscription to post jobs.</p>
                </div>
                <Toggle checked={bossSubscriptionEnabled} onCheckedChange={setBossSubscriptionEnabled} />
              </div>

              {bossSubscriptionEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--color-input-label)]">Subscription Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-bold">AUD</span>
                      <input
                        type="number"
                        min="0.01" step="0.01"
                        value={bossSubscriptionAmount ?? ''}
                        onChange={(e) => setBossSubscriptionAmount(e.target.value ? Number(e.target.value) : null)}
                        placeholder="e.g. 49.99"
                        className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 pl-14 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Monthly fee charged to Bosses via Stripe or PayPal. Currency is locked to AUD.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--color-input-label)]">Currency</label>
                    <div className="flex items-center h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-bg-tertiary)] px-4 text-base text-[var(--color-text-primary)] font-bold">
                      AUD — Australian Dollar
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Subscription currency is locked to AUD platform-wide.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-border-primary)]">
              <Button onClick={handleSavePlatform} disabled={platformSaving} leftIcon={<Save className="h-4 w-4" />}>
                {platformSaving ? 'Saving...' : 'Save Payment Settings'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'admin_management' && (currentUser as AdminProfile | null)?.adminLevel === AdminLevel.SUPER && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              Invite New Admin
            </h3>
            <form onSubmit={handleSendInvite} className="flex gap-4 items-end">
              <div className="flex-1">
                <InputField
                  label="Email Address"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  placeholder="admin@guardmate.com"
                  type="email"
                />
              </div>
              <Button type="submit" disabled={inviting || !inviteEmail} leftIcon={<Send className="h-4 w-4" />}>
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          </Card>

          {loadingAdmins ? (
            <div className="p-8 text-center text-slate-500">Loading admin data...</div>
          ) : adminManagement ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                  Current Admins
                </h3>
                <div className="space-y-4">
                  {adminManagement.admins.map(admin => (
                    <div key={admin.uid} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-800">{admin.firstName} {admin.lastName}</p>
                        <p className="text-sm text-slate-500">{admin.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full uppercase tracking-wider mb-1">
                          {admin.adminLevel}
                        </span>
                        <p className="text-xs text-slate-400">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                  Pending Invitations
                </h3>
                <div className="space-y-4">
                  {adminManagement.pendingInvites.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No pending invitations.</p>
                  ) : (
                    adminManagement.pendingInvites.map(invite => (
                      <div key={invite.id} className="flex flex-col gap-1 p-3 rounded-lg border border-amber-200 bg-amber-50">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-amber-900">{invite.email}</p>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Pending</span>
                        </div>
                        <p className="text-xs text-amber-700">Invited by: {invite.invitedByName}</p>
                        <p className="text-xs text-amber-600">Expires: {new Date(invite.expiresAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
