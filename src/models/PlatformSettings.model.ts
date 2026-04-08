import mongoose, { Document, Model, Schema } from 'mongoose';
import { IPlatformSettings } from '@/types/settings.types';

export type PlatformSettingsDocument = IPlatformSettings & Document;

const PlatformCountrySchema = new Schema({
  countryName: { type: String, required: true },
  countryCode: { type: String, required: true },
  dialCode: { type: String, required: true },
  flag: { type: String, required: true },
}, { _id: false });

const PlatformSettingsSchema = new Schema<PlatformSettingsDocument>({
  platformCountry: {
    type: PlatformCountrySchema,
    default: null,
  },
  checkInRadiusMeters: {
    type: Number,
    default: 500,
    min: 50,
    max: 5000,
  },
  abrGuid: {
    type: String,
    default: null,
  },
  abrVerificationEnabled: {
    type: Boolean,
    default: false,
  },
  platformCurrency: {
    type: String,
    default: 'AUD',
  },
  minimumHourlyRate: {
    type: Number,
    default: null,
  },
  minimumFixedRate: {
    type: Number,
    default: null,
  },
  minimumRateEnforced: {
    type: Boolean,
    default: false,
  },
  minimumRateLastUpdatedAt: {
    type: Date,
    default: null,
  },
  minimumRateLastUpdatedBy: {
    type: String,
    default: null,
  },

  // ─── Phase 6: Commission Settings ──────────────────────────────────────
  platformCommissionBoss: {
    type: Number,
    default: 10,
    min: 0,
    max: 50,
  },
  platformCommissionGuard: {
    type: Number,
    default: 5,
    min: 0,
    max: 50,
  },
  minimumWithdrawalAmount: {
    type: Number,
    default: 50,
    min: 1,
  },

  // ─── Phase 6: Stripe Configuration ─────────────────────────────────────
  stripeEnabled: { type: Boolean, default: false },
  // TODO: Future AES-256 encryption for stripePublishableKey
  stripePublishableKey: { type: String, default: null },
  // TODO: Future AES-256 encryption for stripeSecretKey
  stripeSecretKey: { type: String, default: null },
  // TODO: Future AES-256 encryption for stripeWebhookSecret
  stripeWebhookSecret: { type: String, default: null },
  stripeConnectEnabled: { type: Boolean, default: false },

  // ─── Phase 6: PayPal Configuration ─────────────────────────────────────
  paypalEnabled: { type: Boolean, default: false },
  // TODO: Future AES-256 encryption for paypalClientId
  paypalClientId: { type: String, default: null },
  // TODO: Future AES-256 encryption for paypalClientSecret
  paypalClientSecret: { type: String, default: null },
  // TODO: Future AES-256 encryption for paypalWebhookId
  paypalWebhookId: { type: String, default: null },
  paypalMode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
}, {
  timestamps: true,
});

// Avoid recreation in dev mode
const PlatformSettings: Model<PlatformSettingsDocument> = mongoose.models.PlatformSettings || mongoose.model<PlatformSettingsDocument>('PlatformSettings', PlatformSettingsSchema);

export default PlatformSettings;
