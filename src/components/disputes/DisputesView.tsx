'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getMyDisputes } from '@/lib/api/dispute.api';
import { DisputeResponseModal } from './DisputeResponseModal';
import { Loader2, AlertTriangle, Shield, Clock, FileText } from 'lucide-react';
import type { IDispute } from '@/types/dispute.types';

export function DisputesView({ userRole, userUid }: { userRole: 'BOSS' | 'MATE', userUid: string }) {
  const [disputes, setDisputes] = useState<IDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDispute, setActiveDispute] = useState<IDispute | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const resp = await getMyDisputes({});
      if (resp.success && resp.data) {
        setDisputes(resp.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'UNDER_REVIEW': return 'info';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'neutral';
      default: return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <Card className="p-8 text-center text-[var(--color-text-secondary)]">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-bold mb-2">No Disputes Found</h3>
        <p className="text-sm">You currently have no active or past disputes.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map(dispute => {
        const isAgainstMe = dispute.againstUid === userUid;
        const needsMyResponse = isAgainstMe && dispute.status === 'OPEN' && !dispute.respondedAt;

        return (
          <Card key={dispute._id} className={`p-5 border-l-4 ${needsMyResponse ? 'border-l-[var(--color-warning)]' : 'border-l-[var(--color-primary)]'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">{dispute.jobTitle}</h3>
                  <Badge variant={getStatusColor(dispute.status) as any}>{dispute.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  <span className="font-medium">Reason:</span> {dispute.reason.replace('_', ' ')}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  <span className="font-medium">Raised by:</span> {dispute.raisedByRole} on {new Date(dispute.createdAt!).toLocaleDateString()}
                </p>
                
                {needsMyResponse && (
                  <div className="flex items-center gap-2 p-3 bg-[var(--color-warning-light)] text-[var(--color-warning)] rounded-lg text-sm font-medium mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    Response required by {new Date(dispute.disputeDeadline).toLocaleString()}
                  </div>
                )}
                
                {(dispute.status === 'UNDER_REVIEW' || dispute.status === 'RESOLVED') && (
                  <div className="flex items-center gap-2 p-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-lg text-sm mb-4">
                    <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
                    {dispute.status === 'UNDER_REVIEW' 
                      ? 'Administrator is reviewing evidence.' 
                      : `Resolved on ${new Date(dispute.resolvedAt!).toLocaleDateString()} - Decision: ${dispute.adminDecision}`
                    }
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {needsMyResponse && (
                  <Button 
                    onClick={() => { setActiveDispute(dispute); setShowResponseModal(true); }}
                    className="bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-white"
                  >
                    Respond Now
                  </Button>
                )}
                {/* Real app would have a View Details button here to show all evidence and full description */}
              </div>
            </div>
          </Card>
        );
      })}

      {showResponseModal && activeDispute && (
        <DisputeResponseModal
          disputeId={activeDispute._id!}
          isOpen={showResponseModal}
          onClose={() => { setShowResponseModal(false); setActiveDispute(null); }}
          onSuccess={fetchDisputes}
        />
      )}
    </div>
  );
}
