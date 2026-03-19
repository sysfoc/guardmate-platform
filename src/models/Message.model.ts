import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@/types/enums';

export interface IMessageDocument extends Document {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  senderRole: UserRole;
  text: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderPhoto: { type: String, default: null },
    senderRole: { type: String, enum: Object.values(UserRole), required: true },
    text: { type: String, required: true, maxlength: 1000 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for fast pagination and unread counts
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, isRead: 1 });

const Message: Model<IMessageDocument> =
  mongoose.models.Message || mongoose.model<IMessageDocument>('Message', MessageSchema);

export default Message;
