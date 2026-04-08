'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAdminIncidents, markIncidentReviewed } from '@/lib/api/admin.api';
import type { IIncidentReport } from '@/types/shift.types';
import { IncidentSeverity, IncidentType } from '@/types/enums';
import { AlertTriangle, Filter, Search, CheckCircle2, ChevronLeft, ChevronRight, FileText, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<IIncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const resp = await getAdminIncidents({ page, severity: severityFilter });
      if (resp.success && resp.data) {
        setIncidents(resp.data.incidents);
        setTotal(resp.data.total);
        setTotalPages(resp.data.totalPages);
      }
    } catch {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, severityFilter]);

  const handleMarkReviewed = async (id: string) => {
    setReviewingId(id);
    try {
      const resp = await markIncidentReviewed(id, 'REVIEWED', 'Reviewed from incidents dashboard');
      if (resp.success) {
        toast.success('Incident marked as reviewed');
        setIncidents(prev => prev.map(inc => inc._id === id ? { ...inc, isReviewedByAdmin: true, adminReviewedAt: new Date().toISOString() } : inc));
      }
    } catch {
      toast.error('Failed to review incident');
    } finally {
      setReviewingId(null);
    }
  };

  const getSeverityBadgeCode = (severity: IncidentSeverity) => {
    switch (severity) {
      case IncidentSeverity.CRITICAL: return 'bg-red-950 text-red-400';
      case IncidentSeverity.HIGH: return 'bg-[var(--color-danger-light)] text-[var(--color-danger)]';
      case IncidentSeverity.MEDIUM: return 'bg-[var(--color-warning-light)] text-[var(--color-warning)]';
      case IncidentSeverity.LOW: return 'bg-[var(--color-success-light)] text-[var(--color-success)]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Incident Reports</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Review and manage platform incident reports ({total} total).
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="pl-9 pr-8 py-2 text-sm rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-default)]">
              <tr className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                <th className="px-5 py-3">Incident</th>
                <th className="px-5 py-3">Job ID</th>
                <th className="px-5 py-3">Reporter</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)] mx-auto" />
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[var(--color-text-muted)] text-sm">
                    No incident reports found matching the criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident._id} className={incident.isReviewedByAdmin ? 'bg-[var(--color-bg-subtle)]/30' : ''}>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[9px] ${getSeverityBadgeCode(incident.severity)}`}>
                            {incident.severity}
                          </Badge>
                          <span className="font-bold text-xs text-[var(--color-text-primary)]">
                            {incident.incidentType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 max-w-sm">
                          {incident.description}
                        </p>
                        {incident.location && (
                          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] mt-1">
                            <MapPin className="h-3 w-3" /> {incident.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-[var(--color-text-secondary)]">
                      {incident.jobId.slice(-8)}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {incident.guardName ? incident.guardName : 'Unknown'}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--color-text-secondary)]">
                      {new Date(incident.createdAt as string).toLocaleDateString()}
                      <br/>
                      {new Date(incident.createdAt as string).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {incident.isReviewedByAdmin ? (
                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-[var(--color-success)] uppercase">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reviewed
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs font-bold whitespace-nowrap"
                          onClick={() => handleMarkReviewed(incident._id!)}
                          disabled={reviewingId === incident._id}
                        >
                          {reviewingId === incident._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark Reviewed'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--color-border-default)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
