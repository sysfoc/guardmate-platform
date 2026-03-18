'use client';

/**
 * JobContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides shared job-related state: active filters, selected job, and
 * helper methods for filter manipulation. Syncs filters to URL query params.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { JobFilters } from '@/types/job.types';
import type { IJob } from '@/types/job.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobContextType {
  /** Current active filters */
  filters: JobFilters;
  /** Currently selected/viewed job */
  selectedJob: IJob | null;
  /** Update one or more filters */
  setFilters: (updates: Partial<JobFilters>) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Set the currently selected job */
  setSelectedJob: (job: IJob | null) => void;
}

const DEFAULT_FILTERS: JobFilters = {
  page: 1,
  limit: 12,
  sortBy: 'newest',
};

const JobContext = createContext<JobContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function JobProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<JobFilters>(DEFAULT_FILTERS);
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);

  const setFilters = useCallback((updates: Partial<JobFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...updates,
      // Reset to page 1 when filters change (unless page is being set explicitly)
      page: updates.page ?? 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  return (
    <JobContext.Provider
      value={{
        filters,
        selectedJob,
        setFilters,
        resetFilters,
        setSelectedJob,
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJobs(): JobContextType {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a <JobProvider>');
  }
  return context;
}
