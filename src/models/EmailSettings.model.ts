import mongoose, { Document, Model, Schema } from 'mongoose';
import { NotificationEventType, IEmailSettings } from '@/types/email.types';

export type EmailSettingsDocument = IEmailSettings & Document;

const EmailSettingsSchema = new Schema<EmailSettingsDocument>({
  gmailUser: { type: String, default: '' },
  gmailAppPassword: { type: String, default: '' },
  fromName: { type: String, default: 'GuardMate' },
  fromEmail: { type: String, default: '' },
  replyTo: { type: String, default: '' },
  isConfigured: { type: Boolean, default: false },
  notifications: {
    type: Map,
    of: Boolean,
    default: () => {
      const defaults: Record<string, boolean> = {};
      Object.values(NotificationEventType).forEach((type) => {
        defaults[type as string] = true;
      });
      return defaults;
    }
  }
}, {
  timestamps: true,
});

// Avoid recreation in dev mode
const EmailSettings: Model<EmailSettingsDocument> = mongoose.models.EmailSettings || mongoose.model<EmailSettingsDocument>('EmailSettings', EmailSettingsSchema);

export default EmailSettings;
