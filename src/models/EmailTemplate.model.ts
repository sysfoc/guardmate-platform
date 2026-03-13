import mongoose, { Document, Model, Schema } from 'mongoose';
import { NotificationEventType, IEmailTemplate } from '@/types/email.types';

export type EmailTemplateDocument = IEmailTemplate & Document;

const EmailTemplateSchema = new Schema<EmailTemplateDocument>({
  notificationType: { type: String, enum: Object.values(NotificationEventType), required: true, unique: true },
  subject: { type: String, required: true },
  htmlBody: { type: String, required: true },
  textBody: { type: String, required: true },
  variables: [{ type: String }],
  isActive: { type: Boolean, default: true },
  lastEditedBy: { type: String, default: 'System' },
}, {
  timestamps: true,
});

// Avoid recreation in dev mode
const EmailTemplate: Model<EmailTemplateDocument> = mongoose.models.EmailTemplate || mongoose.model<EmailTemplateDocument>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;
