'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Settings, Save, Mail, AlertTriangle, Eye, EyeOff, Send } from 'lucide-react';
import { emailApi } from '@/lib/api/email.api';
import { settingsApi } from '@/lib/api/settings.api';
import { IEmailSettings, NotificationEventType } from '@/types/email.types';
import { IPlatformSettings, IPlatformCountry } from '@/types/settings.types';
import { countries, Country } from '@/components/ui/PhoneInput';
import { usePlatformContext } from '@/context/PlatformContext';

export default function AdminSettingsPage() {
  const { refreshSettings } = usePlatformContext();

  const [activeTab, setActiveTab] = useState<'config' | 'toggles' | 'platform'>('config');
  const [settings, setSettings] = useState<IEmailSettings | null>(null);
  
  const [platformSettings, setPlatformSettings] = useState<IPlatformSettings | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('none');
  const [checkInRadiusMeters, setCheckInRadiusMeters] = useState<number>(500);
  const [platformSaving, setPlatformSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadAllSettings();
  }, []);

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
      setCheckInRadiusMeters(platformData.checkInRadiusMeters ?? 500);
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
        checkInRadiusMeters
      };

      const updated = await settingsApi.updatePlatformSettings(payload);
      setPlatformSettings(updated);
      setSelectedCountryCode(updated.platformCountry?.countryCode || 'none');
      await refreshSettings(); // Sync global context
      
      setSuccessMsg('Platform configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save platform settings');
    } finally {
      setPlatformSaving(false);
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
    ],
    'Dispute Notifications': [
      { id: NotificationEventType.DISPUTE_RAISED, label: 'Dispute Raised', desc: 'Alerts Admin, Boss, and Guard.' },
      { id: NotificationEventType.DISPUTE_RESOLVED, label: 'Dispute Resolved', desc: 'Alerts Boss and Guard with resolution details.' },
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

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Email Configuration
        </button>
        <button
          onClick={() => setActiveTab('toggles')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'toggles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notification Toggles
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'platform' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Platform Config
        </button>
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

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSave} disabled={saving} leftIcon={<Save className="h-4 w-4" />}>
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button 
                onClick={handleTestEmail} 
                disabled={testing || !settings.gmailUser} 
                variant="outline"
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
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
             <Button onClick={handleSave} disabled={saving} leftIcon={<Save className="h-4 w-4" />}>
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
                <option value="none">🌍 No Restriction (Global Access)</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-6 border-t border-[var(--color-border-primary)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">GPS Geofence Settings</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-4">
                Define the maximum distance a guard can be from the job location to successfully check in.
              </p>
              
              <div className="space-y-2 max-w-sm">
                <label className="text-sm font-medium text-[var(--color-input-label)]">
                  Check-in Radius (meters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    value={checkInRadiusMeters}
                    onChange={(e) => setCheckInRadiusMeters(Number(e.target.value))}
                    className="w-full flex h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] font-medium pointer-events-none">
                    meters
                  </span>
                </div>
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

    </div>
  );
}
