import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IAdminOtp {
  email: string;
  code: string;          // 6-digit OTP
  expiresAt: Date;       // 5-minute TTL
  attempts: number;      // Max 5 verification attempts
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminOtpDocument = IAdminOtp & Document;

// ─── Schema ───────────────────────────────────────────────────────────────────

const AdminOtpSchema = new Schema<AdminOtpDocument>({
  email:     { type: String, required: true, lowercase: true, trim: true, index: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL: auto-delete after expiry
  attempts:  { type: Number, default: 0 },
  used:      { type: Boolean, default: false },
}, {
  timestamps: true,
});

// ─── Model ────────────────────────────────────────────────────────────────────

// HMR support for Next.js dev
if (process.env.NODE_ENV !== 'production' && mongoose.models.AdminOtp) {
  delete mongoose.models.AdminOtp;
}

const AdminOtp: Model<AdminOtpDocument> =
  mongoose.models.AdminOtp || mongoose.model<AdminOtpDocument>('AdminOtp', AdminOtpSchema);

export default AdminOtp;
