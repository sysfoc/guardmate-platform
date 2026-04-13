'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { respondToDispute } from '@/lib/api/dispute.api';

interface DisputeResponseModalProps {
  disputeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DisputeResponseModal({ disputeId, isOpen, onClose, onSuccess }: DisputeResponseModalProps) {
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length + files.length > 5) {
        setError('Maximum 5 files allowed.');
        return;
      }
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (description.length < 30) {
      setError('Description must be at least 30 characters.');
      return;
    }

    setLoading(true);
    try {
      await respondToDispute(disputeId, { description }, files);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Respond to Dispute" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Provide Your Side</h3>
          <p className="text-sm text-[var(--color-text-tertiary)] bg-[var(--color-card-bg-elevated)] p-4 rounded-lg border border-[var(--color-card-border)]">
            A dispute has been raised against you for this job. You have 48 hours to provide your own evidence and explanation. After 48 hours, an administrator will render a final decision.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Your Response
              <span className="text-[var(--color-text-tertiary)] font-normal ml-2">
                ({description.length}/2000 chars)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State your side of the story clearly..."
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
              maxLength={2000}
              required
            />
            {description.length > 0 && description.length < 30 && (
              <p className="text-xs text-red-500 mt-1">Minimum 30 characters required.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Counter Evidence Upload
              <span className="text-[var(--color-text-tertiary)] font-normal ml-2">
                (Max 5 files, e.g., photos, screenshots)
              </span>
            </label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={files.length >= 5}
              className="block w-full text-sm text-[var(--color-text-tertiary)]
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-[var(--button-secondary-bg)] file:text-[var(--button-secondary-text)]
                hover:file:bg-[var(--button-secondary-hover)]"
            />
            
            {files.length > 0 && (
              <ul className="mt-4 space-y-2">
                {files.map((file, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm bg-[var(--color-card-bg-elevated)] p-2 rounded border border-[var(--color-border)]">
                    <span className="truncate max-w-[250px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-red-500 hover:text-red-400 font-medium px-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-[var(--color-border)] mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-[var(--button-secondary-text)] bg-[var(--button-secondary-bg)] hover:bg-[var(--button-secondary-hover)] rounded-xl transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || description.length < 30}
            className="px-5 py-2.5 text-sm font-medium text-[var(--button-primary-text)] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-[var(--button-primary-text)] border-t-transparent rounded-full animate-spin" />
            ) : (
              'Submit Response'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
