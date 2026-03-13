import { IEmailSettings, IEmailTemplate, NotificationEventType } from '@/types/email.types';
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';

export const emailApi = {
  getSettings: async (): Promise<IEmailSettings> => {
    const res = await apiGet<IEmailSettings>('/api/admin/email/settings');
    return res.data;
  },

  updateSettings: async (settings: Partial<IEmailSettings>): Promise<IEmailSettings> => {
    const res = await apiPatch<IEmailSettings>('/api/admin/email/settings', settings);
    return res.data;
  },

  testSettings: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiPost<null>('/api/admin/email/test', {});
    return { success: res.success, message: res.message };
  },

  getTemplates: async (): Promise<IEmailTemplate[]> => {
    const res = await apiGet<IEmailTemplate[]>('/api/admin/email/templates');
    return res.data;
  },

  getTemplate: async (type: NotificationEventType): Promise<IEmailTemplate> => {
    const res = await apiGet<IEmailTemplate>(`/api/admin/email/templates/${type}`);
    return res.data;
  },

  updateTemplate: async (type: NotificationEventType, updates: Partial<IEmailTemplate>): Promise<IEmailTemplate> => {
    const res = await apiPatch<IEmailTemplate>(`/api/admin/email/templates/${type}`, updates);
    return res.data;
  },
};
