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
    return <div className="p-8 text-center text-slate-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12 relative">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Mail className="h-6 w-6 text-blue-600" />
          Email Templates
        </h1>
        <p className="text-sm text-slate-500 mt-1">Customize the HTML layouts and copy for every notification sent by GuardMate.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
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
                <tr key={tmpl.notificationType} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                    {tmpl.notificationType}
                  </td>
                  <td className="px-6 py-4 truncate max-w-xs">{tmpl.subject}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tmpl.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {tmpl.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tmpl.updatedAt ? new Date(tmpl.updatedAt as string).toLocaleDateString() : 'N/A'}
                    <div className="text-xs text-slate-400">by {tmpl.lastEditedBy || 'System'}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(tmpl)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
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
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Template: {selected.notificationType}</h3>
                <p className="text-xs text-slate-500">Edit HTML structure or copy.</p>
              </div>
              <button onClick={closeEdit} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-blue-900">Available Variables</span>
                  <div className="flex flex-wrap gap-2">
                    {selected.variables.map(v => (
                      <span key={v} className="bg-white border border-blue-200 text-blue-800 text-xs px-2 py-1 rounded-md font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <label className="text-sm font-medium text-slate-700">Template Active</label>
                   <input 
                     type="checkbox" 
                     checked={editActive} 
                     onChange={(e) => setEditActive(e.target.checked)} 
                     className="w-4 h-4 text-blue-600"
                   />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">HTML Body</label>
                  <button 
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="h-3 w-3" /> {previewMode ? 'Edit Code' : 'Preview Output'}
                  </button>
                </div>
                
                {previewMode ? (
                  <div className="border border-slate-300 rounded-md bg-slate-100 p-2 h-[400px]">
                    <iframe
                      srcDoc={generatePreview()}
                      className="w-full h-full bg-white rounded shadow-inner"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <textarea
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    className="w-full h-[400px] font-mono text-sm rounded-md border border-slate-300 p-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                  />
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <Button onClick={closeEdit} variant="outline" className="text-slate-600 border-slate-300 hover:bg-slate-100">
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
