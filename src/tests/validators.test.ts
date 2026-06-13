import { describe, it, expect } from 'vitest';
import {
  isValidGeminiApiKey,
  isValidMood,
  isValidSleep,
  isValidStudyHours,
  isValidJournalText,
  isValidName,
  isValidExamType,
  sanitizeInput,
  validateCheckIn,
} from '../services/validators';

describe('Validators Service', () => {
  describe('isValidGeminiApiKey', () => {
    it('accepts valid Gemini API key format', () => {
      expect(isValidGeminiApiKey('AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });

    it('rejects key without AIza prefix', () => {
      expect(isValidGeminiApiKey('sk-something')).toBe(false);
    });

    it('rejects empty key', () => {
      expect(isValidGeminiApiKey('')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidGeminiApiKey(null as any)).toBe(false);
      expect(isValidGeminiApiKey(undefined as any)).toBe(false);
    });

    it('rejects key that is too short', () => {
      expect(isValidGeminiApiKey('AIza')).toBe(false);
    });

    it('rejects key with invalid characters', () => {
      expect(isValidGeminiApiKey('AIzaSy@#$%^&*()')).toBe(false);
    });
  });

  describe('isValidMood', () => {
    it('accepts valid mood scores 1-10', () => {
      for (let i = 1; i <= 10; i++) {
        expect(isValidMood(i)).toBe(true);
      }
    });

    it('rejects mood below 1', () => {
      expect(isValidMood(0)).toBe(false);
      expect(isValidMood(-1)).toBe(false);
    });

    it('rejects mood above 10', () => {
      expect(isValidMood(11)).toBe(false);
    });

    it('rejects non-integer mood', () => {
      expect(isValidMood(5.5)).toBe(false);
    });
  });

  describe('isValidSleep', () => {
    it('accepts valid sleep hours 0-24', () => {
      expect(isValidSleep(0)).toBe(true);
      expect(isValidSleep(12)).toBe(true);
      expect(isValidSleep(24)).toBe(true);
    });

    it('rejects negative sleep', () => {
      expect(isValidSleep(-1)).toBe(false);
    });

    it('rejects sleep over 24', () => {
      expect(isValidSleep(25)).toBe(false);
    });
  });

  describe('isValidStudyHours', () => {
    it('accepts valid study hours 0-24', () => {
      expect(isValidStudyHours(0)).toBe(true);
      expect(isValidStudyHours(12)).toBe(true);
      expect(isValidStudyHours(24)).toBe(true);
    });

    it('rejects negative study hours', () => {
      expect(isValidStudyHours(-1)).toBe(false);
    });
  });

  describe('isValidJournalText', () => {
    it('accepts text with 10+ characters', () => {
      expect(isValidJournalText('This is a valid journal entry.')).toBe(true);
    });

    it('rejects text shorter than 10 characters', () => {
      expect(isValidJournalText('Short')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidJournalText('')).toBe(false);
    });

    it('rejects very long text', () => {
      expect(isValidJournalText('x'.repeat(5001))).toBe(false);
    });

    it('accepts text at exact boundary', () => {
      expect(isValidJournalText('a'.repeat(10))).toBe(true);
      expect(isValidJournalText('a'.repeat(5000))).toBe(true);
    });
  });

  describe('isValidName', () => {
    it('accepts valid names', () => {
      expect(isValidName('Hanzala')).toBe(true);
      expect(isValidName('Priya Sharma')).toBe(true);
      expect(isValidName("O'Connor")).toBe(true);
    });

    it('rejects empty name', () => {
      expect(isValidName('')).toBe(false);
    });

    it('rejects name with numbers', () => {
      expect(isValidName('John123')).toBe(false);
    });

    it('rejects very long name', () => {
      expect(isValidName('A'.repeat(101))).toBe(false);
    });
  });

  describe('isValidExamType', () => {
    it('accepts valid exam types', () => {
      expect(isValidExamType('JEE')).toBe(true);
      expect(isValidExamType('NEET')).toBe(true);
      expect(isValidExamType('UPSC')).toBe(true);
      expect(isValidExamType('CAT')).toBe(true);
      expect(isValidExamType('GATE')).toBe(true);
      expect(isValidExamType('Board Exams')).toBe(true);
    });

    it('rejects invalid exam types', () => {
      expect(isValidExamType('SAT')).toBe(false);
      expect(isValidExamType('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('removes HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<');
    });

    it('encodes quotes', () => {
      expect(sanitizeInput('say "hello"')).toContain('&quot;');
    });

    it('trims whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });
  });

  describe('validateCheckIn', () => {
    it('returns valid for correct inputs', () => {
      const result = validateCheckIn({
        mood: 7,
        sleep: 7,
        study: 8,
        journalText: 'Today was a productive day with good focus.',
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('returns errors for invalid inputs', () => {
      const result = validateCheckIn({
        mood: 15,
        sleep: -1,
        study: 30,
        journalText: 'short',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
