export interface IPlatformCountry {
  countryName: string;
  countryCode: string; // ISO 2-letter, e.g., "GB"
  dialCode: string; // e.g., "+44"
  flag: string; // Emoji
}

export interface IPlatformSettings {
  _id?: string;
  platformCountry: IPlatformCountry | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
