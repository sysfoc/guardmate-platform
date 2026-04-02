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
}, {
  timestamps: true,
});

// Avoid recreation in dev mode
const PlatformSettings: Model<PlatformSettingsDocument> = mongoose.models.PlatformSettings || mongoose.model<PlatformSettingsDocument>('PlatformSettings', PlatformSettingsSchema);

export default PlatformSettings;
