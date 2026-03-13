import { countries } from '@/constants/countries';

/**
 * Formats a phone number with its country dial code.
 * @param phone The raw phone number
 * @param countryCode The ISO country code (e.g. 'GB', 'US')
 * @returns Formatted string like "+44 1234567890" or "GB 1234567890" as fallback
 */
export function formatPhoneNumber(phone: string | null | undefined, countryCode: string | null | undefined): string {
  if (!phone) return '—';
  
  if (!countryCode) return phone;

  const country = countries.find(c => c.code.toUpperCase() === countryCode.toUpperCase());
  
  if (country) {
    return `${country.dialCode} ${phone}`;
  }

  // Fallback if country code is not in our list
  return `${countryCode} ${phone}`;
}
