import { countries, type Country } from '@/constants/countries';
import type { IPlatformCountry } from '@/types/settings.types';

/**
 * Converts an admin-configured `IPlatformCountry` into the `Country` shape
 * used by the PhoneInput component. Returns null when no platform lock is set.
 */
export function platformCountryToCountry(p: IPlatformCountry | null | undefined): Country | null {
  if (!p) return null;
  return {
    name: p.countryName,
    code: p.countryCode,
    dialCode: p.dialCode,
    flag: p.flag,
  };
}

/**
 * Given the admin-enforced platform country and the user's currently saved
 * phone country code, decide which country the PhoneInput should be locked to.
 *
 * Policy ("grandfather"):
 * - If no platform lock is set → return null (user is free to pick any country).
 * - If the user has an existing saved country that differs from the platform
 *   lock → lock to the USER's own country (grandfathered — they registered
 *   before the admin switched the platform region).
 * - Otherwise → lock to the platform country.
 *
 * When `forceSwitchToPlatform` is true the user has explicitly chosen to
 * migrate to the new platform country via the UI action, so we honour that
 * regardless of the saved value.
 */
export function resolvePhoneCountryLock(
  platformCountry: IPlatformCountry | null | undefined,
  userPhoneCountryCode: string | null | undefined,
  forceSwitchToPlatform: boolean = false,
): Country | null {
  const platform = platformCountryToCountry(platformCountry);
  if (!platform) return null;

  if (forceSwitchToPlatform) return platform;

  if (userPhoneCountryCode && userPhoneCountryCode !== platform.code) {
    const userCountry = countries.find((c) => c.code === userPhoneCountryCode);
    // Fall back to the platform lock if the stored code is unknown to us
    // (stale/unsupported country) — safer than leaving the field unlocked.
    return userCountry ?? platform;
  }

  return platform;
}

/**
 * True when the user has a saved phone country that differs from the current
 * platform lock — i.e. they are being grandfathered. The profile page uses
 * this flag to render the "Platform has moved to X" notice.
 */
export function isGrandfatheredCountry(
  platformCountry: IPlatformCountry | null | undefined,
  userPhoneCountryCode: string | null | undefined,
): boolean {
  if (!platformCountry) return false;
  if (!userPhoneCountryCode) return false;
  return userPhoneCountryCode !== platformCountry.countryCode;
}

/**
 * Validates a submitted `phoneCountryCode` against the grandfather policy.
 * Returns an error string when the value is not acceptable, otherwise null.
 */
export function validatePhoneCountrySubmission(params: {
  submitted: string | null | undefined;
  platformCountry: IPlatformCountry | null | undefined;
  userSavedCountry: string | null | undefined;
  phoneIsEmpty: boolean;
}): string | null {
  const { submitted, platformCountry, userSavedCountry, phoneIsEmpty } = params;

  if (phoneIsEmpty) return null; // No phone → no country required.

  if (!submitted) {
    return platformCountry
      ? `Phone country is required.`
      : 'Please select a country for your phone number.';
  }

  if (!platformCountry) return null; // No lock → any country is fine.

  // Grandfather rule: either the platform country OR the user's existing country is acceptable.
  if (submitted === platformCountry.countryCode) return null;
  if (userSavedCountry && submitted === userSavedCountry) return null;

  return `Only ${platformCountry.countryName} phone numbers are accepted on this platform.`;
}
