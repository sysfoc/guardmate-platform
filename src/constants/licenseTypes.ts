/**
 * Shared license type options used across the platform.
 * Ordered by tier: Basic → Mid → Advanced.
 * Must stay aligned with guardmate-ai/matcher.py LICENSE_HIERARCHY.
 */

export const LICENSE_OPTIONS = [
  // Tier 1 — Basic
  'Security Guard',
  'CCTV Operator',
  'Event Security',
  'Static Guard',
  'Alarm Response',
  // Tier 2 — Mid
  'Door Supervisor',
  'Mobile Patrol',
  'Cash-in-Transit',
  'K9 Handler',
  'Crowd Controller',
  // Tier 3 — Advanced
  'Close Protection',
  'Executive Protection',
  'Maritime Security',
  'Firearms Security',
  'Private Investigator',
] as const;

export type LicenseType = (typeof LICENSE_OPTIONS)[number];
