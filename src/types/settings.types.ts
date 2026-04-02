export interface IPlatformCountry {
  countryName: string;
  countryCode: string; // ISO 2-letter, e.g., "GB"
  dialCode: string; // e.g., "+44"
  flag: string; // Emoji
}

export interface IPlatformSettings {
  _id?: string;
  platformCountry: IPlatformCountry | null;
  checkInRadiusMeters: number;
  abrGuid: string | null;
  abrVerificationEnabled: boolean;
  platformCurrency: string;
  minimumHourlyRate: number | null;
  minimumFixedRate: number | null;
  minimumRateEnforced: boolean;
  minimumRateLastUpdatedAt: string | Date | null;
  minimumRateLastUpdatedBy: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
