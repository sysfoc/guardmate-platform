import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IAdminInvite {
  email: string;
  invitedBy: string;       // Admin UID who sent the invite
  invitedByName: string;   // Admin's display name
  token: string;           // Crypto-random invite token
  expiresAt: Date;         // 24-hour TTL
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminInviteDocument = IAdminInvite & Document;

// ─── Schema ───────────────────────────────────────────────────────────────────

const AdminInviteSchema = new Schema<AdminInviteDocument>({
  email:         { type: String, required: true, lowercase: true, trim: true, index: true },
  invitedBy:     { type: String, required: true },
  invitedByName: { type: String, required: true },
  token:         { type: String, required: true, unique: true, index: true },
  expiresAt:     { type: Date, required: true, index: { expires: 0 } }, // TTL: auto-delete after expiry
  used:          { type: Boolean, default: false },
  usedAt:        { type: Date, default: null },
}, {
  timestamps: true,
});

// Compound index: find active invites for an email efficiently
AdminInviteSchema.index({ email: 1, used: 1 });

// ─── Model ────────────────────────────────────────────────────────────────────

// HMR support for Next.js dev
if (process.env.NODE_ENV !== 'production' && mongoose.models.AdminInvite) {
  delete mongoose.models.AdminInvite;
}

const AdminInvite: Model<AdminInviteDocument> =
  mongoose.models.AdminInvite || mongoose.model<AdminInviteDocument>('AdminInvite', AdminInviteSchema);

export default AdminInvite;
