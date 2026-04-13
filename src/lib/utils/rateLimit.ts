/**
 * rateLimit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simple in-memory rate limiter for API routes.
 * NOTE: This only works per-instance. For multi-instance deployments,
 * consider using Redis-based rate limiting instead.
 */

const rateLimitStore = new Map<string, number[]>();

// Periodically clean up old entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const recent = timestamps.filter(t => now - t < windowMs);
    if (recent.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, recent);
    }
  }
}

/**
 * Check if a request should be rate-limited.
 * 
 * @param key - Unique identifier (e.g., user UID or IP)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();

  cleanup(windowMs);

  const timestamps = rateLimitStore.get(key) || [];
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return false; // Rate limited
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return true; // Allowed
}
