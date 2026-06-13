import { describe, it, expect, beforeEach } from 'vitest';
import { isRateLimited, getRemainingRequests, resetRateLimit, clearAllRateLimits } from '../services/rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe('isRateLimited', () => {
    it('allows first request', () => {
      expect(isRateLimited('test-api', 5, 60000)).toBe(false);
    });

    it('allows requests up to max', () => {
      for (let i = 0; i < 4; i++) {
        isRateLimited('test-api', 5, 60000);
      }
      expect(isRateLimited('test-api', 5, 60000)).toBe(false);
    });

    it('blocks after max requests', () => {
      for (let i = 0; i < 5; i++) {
        isRateLimited('test-api', 5, 60000);
      }
      expect(isRateLimited('test-api', 5, 60000)).toBe(true);
    });

    it('tracks different keys independently', () => {
      for (let i = 0; i < 5; i++) {
        isRateLimited('key-a', 5, 60000);
      }
      expect(isRateLimited('key-a', 5, 60000)).toBe(true);
      expect(isRateLimited('key-b', 5, 60000)).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('returns full count when no requests made', () => {
      expect(getRemainingRequests('fresh-key', 10, 60000)).toBe(10);
    });

    it('decrements correctly', () => {
      isRateLimited('test-remaining', 10, 60000);
      isRateLimited('test-remaining', 10, 60000);
      expect(getRemainingRequests('test-remaining', 10, 60000)).toBe(8);
    });
  });

  describe('resetRateLimit', () => {
    it('resets a specific key', () => {
      for (let i = 0; i < 5; i++) {
        isRateLimited('reset-test', 5, 60000);
      }
      expect(isRateLimited('reset-test', 5, 60000)).toBe(true);
      resetRateLimit('reset-test');
      expect(isRateLimited('reset-test', 5, 60000)).toBe(false);
    });
  });
});
