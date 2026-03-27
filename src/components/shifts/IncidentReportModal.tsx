'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IncidentType, IncidentSeverity } from '@/types/enums';
import { submitIncidentReport } from '@/lib/api/shift.api';
import { AlertTriangle, FileText, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface IncidentReportModalProps {
  jobId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  [IncidentType.THEFT]: 'Theft / Robbery',
  [IncidentType.ASSAULT]: 'Physical Assault',
  [IncidentType.MEDICAL]: 'Medical Emergency',
  [IncidentType.TRESPASSING]: 'Trespassing',
  [IncidentType.PROPERTY_DAMAGE]: 'Property Damage',
  [IncidentType.SUSPICIOUS_ACTIVITY]: 'Suspicious Activity',
  [IncidentType.OTHER]: 'Other',
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string }> = {
  [IncidentSeverity.LOW]: { label: 'Low', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
  [IncidentSeverity.MEDIUM]: { label: 'Medium', color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' },
  [IncidentSeverity.HIGH]: { label: 'High', color: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' },
  [IncidentSeverity.CRITICAL]: { label: 'Critical', color: 'bg-red-950/20 text-red-400 dark:bg-red-950/40 dark:text-red-300' },
};

export default function IncidentReportModal({ jobId, onSuccess, onClose }: IncidentReportModalProps) {
  const [incidentType, setIncidentType] = useState<IncidentType | ''>('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const charCount = description.length;
  const canSubmit = incidentType && severity && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !incidentType || !severity) return;

    setIsSubmitting(true);
    try {
      await submitIncidentReport({
        jobId,
        incidentType,
        severity,
        description: description.trim(),
        location: location.trim() || undefined,
      });
      toast.success('Incident report submitted successfully.');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? 'Failed to submit incident report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Report Incident" size="lg">
      <div className="space-y-5 p-1">
        {/* Header Warning */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20">
          <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Please provide accurate details about the incident. This report will be sent to the employer and platform administrators.
          </p>
        </div>

        {/* Incident Type */}
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
            Incident Type <span className="text-[var(--color-danger)]">*</span>
          </label>
          <select
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value as IncidentType)}
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent"
          >
            <option value="">Select incident type...</option>
            {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
            Severity Level <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeverity(value as IncidentSeverity)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
                  severity === value
                    ? `${config.color} border-current ring-2 ring-current/20`
                    : 'border-[var(--color-input-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
            Description <span className="text-[var(--color-danger)]">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            placeholder="Describe the incident in detail..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent resize-none"
          />
          <p className={`text-xs mt-1 text-right ${charCount > 1800 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
            {charCount}/2000
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
            <MapPin className="h-3.5 w-3.5 inline mr-1" />
            Exact Location <span className="text-[var(--color-text-muted)]">(optional)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. North gate, Building A entrance..."
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent"
          />
        </div>

        {/* Preview Badges */}
        {(incidentType || severity) && (
          <div className="flex items-center gap-2 flex-wrap">
            {incidentType && (
              <Badge className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {INCIDENT_TYPE_LABELS[incidentType]}
              </Badge>
            )}
            {severity && (
              <Badge className={`text-xs ${SEVERITY_CONFIG[severity].color}`}>
                {SEVERITY_CONFIG[severity].label}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border-default)]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 sm:flex-none bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-[var(--color-text-inverse)]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
