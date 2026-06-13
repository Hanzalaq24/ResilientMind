// API Rate Limiter Service
// Prevents excessive API calls with sliding window rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if an API call is allowed under the rate limit.
 * @param key - Unique identifier for the rate limit bucket (e.g., API endpoint)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function isRateLimited(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    // New window or expired window
    store.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) {
    return true; // Rate limited
  }

  entry.count++;
  return false;
}

/**
 * Get remaining requests in current window.
 */
export function getRemainingRequests(
  key: string,
  maxRequests: number = 30,
  _windowMs: number = 60000
): number {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    return maxRequests;
  }

  return Math.max(0, maxRequests - entry.count);
}

/**
 * Reset rate limit for a specific key.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clear all rate limit state.
 */
export function clearAllRateLimits(): void {
  store.clear();
}
