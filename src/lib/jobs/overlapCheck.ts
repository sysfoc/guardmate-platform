/**
 * Utility to check if two time periods overlap.
 * Two time periods overlap if the start of the first is strictly before the end of the second,
 * AND the end of the first is strictly after the start of the second.
 *
 * @param startA Start time of first period
 * @param endA End time of first period
 * @param startB Start time of second period
 * @param endB End time of second period
 * @returns boolean True if the periods overlap, false otherwise
 */
export function checkDateOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}
