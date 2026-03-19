import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@/types/enums';

export interface IConversationDocument extends Document {
  participants: {
    uid: string;
    name: string;
    photo: string | null;
    role: UserRole;
  }[];
  jobId: string;
  jobTitle: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCounts: Record<string, number>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    participants: [
      {
        uid: { type: String, required: true },
        name: { type: String, required: true },
        photo: { type: String, default: null },
        role: { type: String, enum: Object.values(UserRole), required: true },
      },
    ],
    jobId: { type: String, required: true },
    jobTitle: { type: String, default: 'GuardMate Job' },
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    unreadCounts: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
// Add index on participant uid for fast lookups per user
ConversationSchema.index({ 'participants.uid': 1 });

// Add compound unique index on jobId + exact participants to prevent duplicates
ConversationSchema.index(
  { jobId: 1, 'participants.0.uid': 1, 'participants.1.uid': 1 },
  { unique: true }
);

const Conversation: Model<IConversationDocument> =
  mongoose.models.Conversation || mongoose.model<IConversationDocument>('Conversation', ConversationSchema);

export default Conversation;
