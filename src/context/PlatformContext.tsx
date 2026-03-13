'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { IPlatformSettings, IPlatformCountry } from '@/types/settings.types';
import { settingsApi } from '@/lib/api/settings.api';

interface PlatformContextType {
  platformSettings: IPlatformSettings | null;
  platformCountry: IPlatformCountry | null;
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

  return (
    <PlatformContext.Provider
      value={{
        platformSettings,
        platformCountry: platformSettings?.platformCountry || null,
        loading,
        refreshSettings: loadSettings,
      }}
    >
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
