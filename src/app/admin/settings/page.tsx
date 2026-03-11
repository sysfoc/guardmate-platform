'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Settings, Shield, Bell, Database, Save } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-600" />
            System Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Configure platform-wide rules and administrative preferences.</p>
        </div>
        <Button leftIcon={<Save className="h-4 w-4" />}>Save Configuration</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <h3 className="font-bold flex items-center gap-2 text-sm mb-1">
              <Shield className="h-4 w-4" />
              Security Mode
            </h3>
            <p className="text-xs opacity-80">Configure how new users are admitted to the system.</p>
          </div>
          <nav className="space-y-1">
            {['General', 'Verifications', 'Notifications', 'Database', 'Payments'].map((item) => (
              <button key={item} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-hover)] transition-colors">
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card className="p-6 md:p-8 space-y-8">
            <section className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Shield className="h-5 w-5 text-[var(--color-primary)]" />
                Enrollment Rules
              </h3>
              <div className="space-y-4 pt-2 border-t border-[var(--color-surface-border)]">
                <Toggle 
                  label="Manual Guard Verification" 
                  description="Require admins to manually approve every new security guard profile."
                  checked={true}
                  onCheckedChange={() => {}} 
                />
                <Toggle 
                  label="Company License Auto-Check" 
                  description="Attempt to verify company registration numbers via public APIs automatically."
                  checked={false}
                  onCheckedChange={() => {}} 
                />
              </div>
            </section>

            <section className="space-y-4 pt-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Bell className="h-5 w-5 text-blue-500" />
                Administrative Alerts
              </h3>
              <div className="space-y-4 pt-2 border-t border-[var(--color-surface-border)]">
                <Toggle 
                  label="Critical System Incident Emails" 
                  description="Receive immediate email alerts for server failures or security breaches."
                  checked={true}
                  onCheckedChange={() => {}} 
                />
                <Toggle 
                  label="New Applicant Pushes" 
                  description="Get browser notifications whenever a new verification is pending."
                  checked={true}
                  onCheckedChange={() => {}} 
                />
              </div>
            </section>

            <section className="space-y-4 pt-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Database className="h-5 w-5 text-emerald-500" />
                Maintenance
              </h3>
              <div className="space-y-4 pt-2 border-t border-[var(--color-surface-border)]">
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
                  <div>
                    <p className="text-sm font-bold text-red-700">Maintenance Mode</p>
                    <p className="text-xs text-red-600">Disable all frontend access except for admins.</p>
                  </div>
                  <Toggle checked={false} onCheckedChange={() => {}} />
                </div>
              </div>
            </section>
          </Card>
        </div>
      </div>
    </div>
  );
}
