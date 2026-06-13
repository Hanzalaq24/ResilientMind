import { describe, it, expect } from 'vitest';
import { detectStressTriggers, formatTriggerReport } from '../services/stressDetection';

describe('Stress Trigger Detection', () => {
  describe('detectStressTriggers', () => {
    it('detects critical sleep deprivation', () => {
      const triggers = detectStressTriggers(5, 3, 8, 'Feeling tired');
      const sleepTrigger = triggers.find(t => t.trigger === 'Critical sleep deprivation');
      expect(sleepTrigger).toBeDefined();
      expect(sleepTrigger?.severity).toBe('high');
    });

    it('detects extreme study overload', () => {
      const triggers = detectStressTriggers(5, 7, 14, 'Studied all day');
      const studyTrigger = triggers.find(t => t.trigger === 'Extreme study overload');
      expect(studyTrigger).toBeDefined();
      expect(studyTrigger?.severity).toBe('high');
    });

    it('detects severe emotional distress from low mood', () => {
      const triggers = detectStressTriggers(2, 7, 6, 'Feeling okay');
      const emotionTrigger = triggers.find(t => t.trigger === 'Severe emotional distress');
      expect(emotionTrigger).toBeDefined();
      expect(emotionTrigger?.severity).toBe('high');
    });

    it('detects mock test pressure from journal text', () => {
      const triggers = detectStressTriggers(6, 7, 8, 'Mock test went terribly');
      const mockTrigger = triggers.find(t => t.trigger === 'Mock test pressure');
      expect(mockTrigger).toBeDefined();
    });

    it('detects academic failure fear from journal text', () => {
      const triggers = detectStressTriggers(4, 6, 9, 'I failed my test again');
      const failTrigger = triggers.find(t => t.trigger === 'Academic failure fear');
      expect(failTrigger).toBeDefined();
    });

    it('detects self-doubt from journal text', () => {
      const triggers = detectStressTriggers(5, 7, 8, "I can't crack this exam");
      const doubtTrigger = triggers.find(t => t.trigger === 'Self-doubt and impostor syndrome');
      expect(doubtTrigger).toBeDefined();
    });

    it('detects burnout keyword from journal text', () => {
      const triggers = detectStressTriggers(4, 5, 10, 'Feeling complete burnout');
      const burnoutTrigger = triggers.find(t => t.trigger === 'Self-reported burnout');
      expect(burnoutTrigger).toBeDefined();
      expect(burnoutTrigger?.severity).toBe('high');
    });

    it('detects motivational crisis from journal text', () => {
      const triggers = detectStressTriggers(3, 6, 8, 'I want to give up');
      const quitTrigger = triggers.find(t => t.trigger === 'Motivational crisis');
      expect(quitTrigger).toBeDefined();
      expect(quitTrigger?.severity).toBe('high');
    });

    it('returns empty array for healthy metrics and neutral text', () => {
      const triggers = detectStressTriggers(8, 8, 5, 'Today was a good day, feeling motivated');
      expect(triggers.length).toBe(0);
    });

    it('sorts triggers by severity (high first)', () => {
      const triggers = detectStressTriggers(2, 3, 14, 'Failed mock test, can\'t crack it');
      if (triggers.length >= 2) {
        const severityOrder = { high: 0, moderate: 1, low: 2 };
        for (let i = 1; i < triggers.length; i++) {
          expect(severityOrder[triggers[i].severity]).toBeGreaterThanOrEqual(
            severityOrder[triggers[i - 1].severity]
          );
        }
      }
    });

    it('avoids duplicate triggers for same keyword', () => {
      const triggers = detectStressTriggers(3, 4, 11, 'Failed the mock test today');
      const mockTriggers = triggers.filter(t => t.trigger.includes('Mock'));
      expect(mockTriggers.length).toBe(1);
    });
  });

  describe('formatTriggerReport', () => {
    it('formats triggers into readable report', () => {
      const triggers = detectStressTriggers(2, 3, 12, 'Failed everything');
      const report = formatTriggerReport(triggers);
      expect(report).toContain('Detected Stress Triggers');
      expect(report.length).toBeGreaterThan(20);
    });

    it('returns no-triggers message when empty', () => {
      const report = formatTriggerReport([]);
      expect(report).toContain('No significant stress triggers');
    });
  });
});
