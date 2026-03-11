import mongoose, { Document, Model, Schema } from 'mongoose';
import { AdminActionType } from '@/types/admin.types';

// ─── Document Interface ───────────────────────────────────────────────────────

export interface IAdminActivity {
  adminUid: string;
  adminName: string;
  actionType: AdminActionType;
  targetType: 'USER' | 'JOB' | 'PAYMENT' | 'SETTING' | 'SYSTEM';
  targetId: string | null;
  targetName: string | null;
  targetRole: string | null;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export type AdminActivityDocument = IAdminActivity & Document;

// ─── Schema ───────────────────────────────────────────────────────────────────

const AdminActivitySchema = new Schema<AdminActivityDocument>(
  {
    adminUid: { type: String, required: true, index: true },
    adminName: { type: String, required: true },
    actionType: {
      type: String,
      enum: Object.values(AdminActionType),
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['USER', 'JOB', 'PAYMENT', 'SETTING', 'SYSTEM'],
      required: true,
    },
    targetId: { type: String, default: null },
    targetName: { type: String, default: null },
    targetRole: { type: String, default: null },
    details: { type: String, required: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

AdminActivitySchema.index({ createdAt: -1 });
AdminActivitySchema.index({ adminUid: 1, createdAt: -1 });
AdminActivitySchema.index({ actionType: 1, createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const AdminActivity: Model<AdminActivityDocument> =
  mongoose.models.AdminActivity ||
  mongoose.model<AdminActivityDocument>('AdminActivity', AdminActivitySchema);

export default AdminActivity;
