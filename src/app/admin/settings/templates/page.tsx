'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Mail, Edit, Save, Eye, X } from 'lucide-react';
import { emailApi } from '@/lib/api/email.api';
import { IEmailTemplate } from '@/types/email.types';

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<IEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IEmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await emailApi.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (tmpl: IEmailTemplate) => {
    setSelected(tmpl);
    setEditSubject(tmpl.subject);
    setEditHtml(tmpl.htmlBody);
    setEditActive(tmpl.isActive);
    setPreviewMode(false);
  };

  const closeEdit = () => {
    setSelected(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const updated = await emailApi.updateTemplate(selected.notificationType, {
        subject: editSubject,
        htmlBody: editHtml,
        isActive: editActive,
      });
      setTemplates((prev) => prev.map((t) => (t.notificationType === updated.notificationType ? updated : t)));
      closeEdit();
    } catch (err) {
      console.error('Failed to save template', err);
      alert('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = () => {
    if (!selected) return '';
    let preview = editHtml;
    // Replace {{variableName}} with dummy values
    selected.variables.forEach((variable) => {
      const dummyValues: Record<string, string> = {
        firstName: 'John',
        bossName: 'Jane Boss',
        guardName: 'Guard Alex',
        companyName: 'Acme Security Ltd.',
        email: 'john@example.com',
        role: 'guard',
        reason: 'Violation of terms of service.',
        jobName: 'Night Patrol at Warehouse',
        amount: '150.00',
        date: 'Oct 24, 2026',
        time: '22:00',
        location: 'Downtown Logistics Hub',
        licenseNumber: 'LIC-987654321',
        expiryDate: 'Dec 31, 2026',
        dashboardUrl: '#',
        resolution: 'Payment fully refunded to boss.',
      };
      
      const regex = new RegExp(`{{(?:\\s+)?${variable}(?:\\s+)?}}`, 'g');
      preview = preview.replace(regex, dummyValues[variable] || `[${variable}]`);
    });
    return preview;
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading templates...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12 relative">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
          <Mail className="h-6 w-6 text-[var(--color-primary)]" />
          Email Templates
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Customize the HTML layouts and copy for every notification sent by GuardMate.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-[var(--color-text-muted)]">
            <thead className="text-xs text-[var(--color-text-primary)] uppercase bg-[var(--color-bg-subtle)] border-b border-[var(--color-surface-border)]">
              <tr>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Subject Preview</th>
                <th className="px-6 py-4 text-center">Active</th>
                <th className="px-6 py-4">Last Edited</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tmpl) => (
                <tr key={tmpl.notificationType} className="bg-[var(--color-surface)] border-b border-[var(--color-surface-border)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                    {tmpl.notificationType}
                  </td>
                  <td className="px-6 py-4 truncate max-w-xs">{tmpl.subject}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tmpl.isActive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}`}>
                      {tmpl.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tmpl.updatedAt ? new Date(tmpl.updatedAt as string).toLocaleDateString() : 'N/A'}
                    <div className="text-xs text-[var(--color-text-muted)]">by {tmpl.lastEditedBy || 'System'}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(tmpl)}
                      className="text-[var(--color-primary)] hover:text-[var(--color-primary)] p-2 rounded-full hover:bg-[var(--color-primary)]/10 transition-colors"
                      title="Edit Template"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Editor Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-[var(--color-surface-border)] flex justify-between items-center bg-[var(--color-bg-subtle)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Template: {selected.notificationType}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">Edit HTML structure or copy.</p>
              </div>
              <button onClick={closeEdit} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-[var(--color-bg-subtle)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-[var(--color-surface)] space-y-6">
              <div className="flex justify-between items-center bg-[var(--color-info)]/10 p-4 rounded-lg border border-[var(--color-info)]/20">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">Available Variables</span>
                  <div className="flex flex-wrap gap-2">
                    {selected.variables.map(v => (
                      <span key={v} className="bg-[var(--color-surface)] border border-[var(--color-info)]/20 text-[var(--color-info)] text-xs px-2 py-1 rounded-md font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <label className="text-sm font-medium text-[var(--color-text-primary)]">Template Active</label>
                   <input 
                     type="checkbox" 
                     checked={editActive} 
                     onChange={(e) => setEditActive(e.target.checked)} 
                     className="w-4 h-4 text-[var(--color-primary)]"
                   />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Email Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">HTML Body</label>
                  <button 
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-xs flex items-center gap-1 text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <Eye className="h-3 w-3" /> {previewMode ? 'Edit Code' : 'Preview Output'}
                  </button>
                </div>
                
                {previewMode ? (
                  <div className="border border-[var(--color-input-border)] rounded-md bg-[var(--color-bg-subtle)] p-2 h-[400px]">
                    <iframe
                      srcDoc={generatePreview()}
                      className="w-full h-full bg-[var(--color-surface)] rounded shadow-inner"
                      title="Email Preview"
                      width="100%"
                      height="400"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <textarea
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    className="w-full h-[400px] font-mono text-sm rounded-md border border-[var(--color-input-border)] bg-[var(--color-bg-subtle)] p-4 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-surface-border)] bg-[var(--color-bg-subtle)] flex justify-end gap-3">
              <Button onClick={closeEdit} variant="outline" className="text-[var(--color-text-secondary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-subtle)]">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} leftIcon={<Save className="h-4 w-4" />}>
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
