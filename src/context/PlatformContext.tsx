'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { IPlatformSettings, IPlatformCountry } from '@/types/settings.types';
import { settingsApi } from '@/lib/api/settings.api';

interface PlatformContextType {
  platformSettings: IPlatformSettings | null;
  platformCountry: IPlatformCountry | null;
  platformCurrency: string;
  minimumHourlyRate: number | null;
  minimumFixedRate: number | null;
  minimumRateEnforced: boolean;
  // Phase 6: Payment context
  platformCommissionBoss: number;
  platformCommissionGuard: number;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  stripePublishableKey: string | null;
  paypalClientId: string | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platformSettings, setPlatformSettings] = useState<IPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getPlatformSettings();
      setPlatformSettings(data);
    } catch (error) {
      console.error('Failed to load platform settings on boot:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const value = useMemo(() => ({
    platformSettings,
    platformCountry: platformSettings?.platformCountry || null,
    platformCurrency: platformSettings?.platformCurrency || 'AUD',
    minimumHourlyRate: platformSettings?.minimumHourlyRate ?? null,
    minimumFixedRate: platformSettings?.minimumFixedRate ?? null,
    minimumRateEnforced: platformSettings?.minimumRateEnforced ?? false,
    // Phase 6: Payment context
    platformCommissionBoss: platformSettings?.platformCommissionBoss ?? 10,
    platformCommissionGuard: platformSettings?.platformCommissionGuard ?? 5,
    stripeEnabled: platformSettings?.stripeEnabled ?? false,
    paypalEnabled: platformSettings?.paypalEnabled ?? false,
    stripePublishableKey: platformSettings?.stripePublishableKey ?? null,
    paypalClientId: platformSettings?.paypalClientId ?? null,
    loading,
    refreshSettings: loadSettings,
  }), [platformSettings, loading]);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatformContext = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatformContext must be used within a PlatformProvider');
  }
  return context;
};
