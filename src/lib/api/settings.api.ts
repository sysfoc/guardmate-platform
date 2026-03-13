import { IPlatformSettings } from '@/types/settings.types';
import { apiGet, apiPatch } from '@/lib/apiClient';

export const settingsApi = {
  getPlatformSettings: async (): Promise<IPlatformSettings> => {
    const res = await apiGet<IPlatformSettings>('/api/settings/platform', { public: true });
    return res.data;
  },

  updatePlatformSettings: async (settings: Partial<IPlatformSettings>): Promise<IPlatformSettings> => {
    const res = await apiPatch<IPlatformSettings>('/api/admin/settings/platform', settings);
    return res.data;
  },
};
