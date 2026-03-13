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
}, {
  timestamps: true,
});

// Avoid recreation in dev mode
const PlatformSettings: Model<PlatformSettingsDocument> = mongoose.models.PlatformSettings || mongoose.model<PlatformSettingsDocument>('PlatformSettings', PlatformSettingsSchema);

export default PlatformSettings;
