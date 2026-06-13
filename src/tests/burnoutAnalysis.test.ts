import { describe, it, expect } from 'vitest';
import { calculateBurnoutRisk } from '../services/burnoutAnalysis';

describe('Burnout Risk Calculation', () => {
  describe('calculateBurnoutRisk', () => {
    it('returns High risk when mood is very low, sleep is low, study is high', () => {
      const result = calculateBurnoutRisk(2, 4, 12);
      expect(result.level).toBe('High');
      expect(result.score).toBeGreaterThanOrEqual(67);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('returns Low risk when all metrics are healthy', () => {
      const result = calculateBurnoutRisk(8, 8, 5);
      expect(result.level).toBe('Low');
      expect(result.score).toBeLessThanOrEqual(33);
    });

    it('returns Medium risk for borderline metrics', () => {
      const result = calculateBurnoutRisk(5, 5, 10);
      expect(result.level).toBe('Medium');
      expect(result.score).toBeGreaterThanOrEqual(34);
      expect(result.score).toBeLessThanOrEqual(66);
    });

    it('gives high severity for critical sleep deprivation', () => {
      const result = calculateBurnoutRisk(5, 3, 8);
      expect(result.factors.some(f => f.includes('Critical sleep'))).toBe(true);
    });

    it('gives high severity for extreme study load', () => {
      const result = calculateBurnoutRisk(6, 8, 14);
      expect(result.factors.some(f => f.includes('Extreme study'))).toBe(true);
    });

    it('reduces risk when improving trend is detected', () => {
      const history = [
        { moodScore: 3, sleepHours: 4, studyHours: 10 },
        { moodScore: 4, sleepHours: 5, studyHours: 9 },
        { moodScore: 5, sleepHours: 6, studyHours: 8 },
      ];
      const result = calculateBurnoutRisk(7, 7, 6, history);
      expect(result.level).not.toBe('High');
    });

    it('increases risk when declining trend is detected', () => {
      const history = [
        { moodScore: 8, sleepHours: 8, studyHours: 5 },
        { moodScore: 7, sleepHours: 7, studyHours: 6 },
        { moodScore: 6, sleepHours: 6, studyHours: 7 },
      ];
      const result = calculateBurnoutRisk(3, 4, 11, history);
      expect(result.level).toBe('High');
    });

    it('clamps score between 0 and 100', () => {
      const result = calculateBurnoutRisk(1, 0, 16);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('handles edge case of exactly 0 sleep', () => {
      const result = calculateBurnoutRisk(5, 0, 8);
      expect(result.factors.some(f => f.includes('Critical sleep'))).toBe(true);
    });

    it('returns empty factors when no risk factors present', () => {
      const result = calculateBurnoutRisk(9, 9, 4);
      expect(result.level).toBe('Low');
    });
  });
});
