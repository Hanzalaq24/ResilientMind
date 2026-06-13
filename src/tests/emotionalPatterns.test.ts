import { describe, it, expect } from 'vitest';
import { analyzeEmotionalPatterns } from '../services/emotionalPatterns';

describe('Emotional Pattern Analysis', () => {
  const makeEntry = (mood: number, sleep: number, study: number, journal: string, daysAgo: number = 0) => ({
    moodScore: mood,
    sleepHours: sleep,
    studyHours: study,
    journalText: journal,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  });

  describe('analyzeEmotionalPatterns', () => {
    it('returns null for single entry', () => {
      const result = analyzeEmotionalPatterns([makeEntry(5, 7, 8, 'test')]);
      expect(result).toBeNull();
    });

    it('detects improving trend', () => {
      const history = [
        makeEntry(3, 5, 9, 'Bad', 3),
        makeEntry(5, 6, 7, 'Tired', 2),
        makeEntry(7, 7, 6, 'Okay', 1),
        makeEntry(8, 8, 5, 'Good day', 0),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.trend).toBe('improving');
    });

    it('detects declining trend', () => {
      const history = [
        makeEntry(8, 8, 5, 'Good', 3),
        makeEntry(7, 7, 6, 'Okay', 2),
        makeEntry(5, 6, 8, 'Bad', 1),
        makeEntry(3, 4, 12, 'Terrible', 0),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.trend).toBe('declining');
    });

    it('detects stable pattern', () => {
      const history = [
        makeEntry(6, 7, 7, 'Normal', 0),
        makeEntry(6, 7, 7, 'Normal', 1),
        makeEntry(7, 7, 7, 'Normal', 2),
        makeEntry(6, 7, 7, 'Normal', 3),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.trend).toBe('stable');
    });

    it('identifies frequent low-mood episodes', () => {
      const history = [
        makeEntry(3, 5, 10, 'Low', 0),
        makeEntry(2, 6, 9, 'Very low', 1),
        makeEntry(4, 7, 8, 'Meh', 2),
        makeEntry(3, 6, 9, 'Low', 3),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.triggers.some(t => t.includes('low-mood episodes'))).toBe(true);
    });

    it('identifies persistent sleep deprivation', () => {
      const history = [
        makeEntry(5, 4, 8, 'Tired', 0),
        makeEntry(5, 5, 9, 'Tired', 1),
        makeEntry(6, 4, 10, 'Sleepy', 2),
        makeEntry(5, 3, 11, 'Exhausted', 3),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.triggers.some(t => t.includes('sleep deprivation'))).toBe(true);
    });

    it('returns correct dominant emotion for low average mood', () => {
      const history = [
        makeEntry(2, 5, 10, 'Bad'),
        makeEntry(3, 5, 9, 'Bad'),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.dominantEmotion).toBe('Distress');
    });

    it('returns correct dominant emotion for high average mood', () => {
      const history = [
        makeEntry(9, 8, 5, 'Great'),
        makeEntry(8, 8, 6, 'Good'),
      ];
      const result = analyzeEmotionalPatterns(history);
      expect(result).not.toBeNull();
      expect(result!.dominantEmotion).toBe('Resilience');
    });
  });
});
