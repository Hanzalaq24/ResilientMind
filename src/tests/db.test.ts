import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../lib/db';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'window', { value: global, writable: true });
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  },
  writable: true
});

describe('Simulated LocalStorage Database (db.ts)', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should create and retrieve a user', () => {
    const user = db.createUser('Hanzala', 'JEE');
    expect(user.name).toBe('Hanzala');
    expect(user.examType).toBe('JEE');
    expect(user.id).toBeDefined();

    const current = db.getCurrentUser();
    expect(current).not.toBeNull();
    expect(current?.name).toBe('Hanzala');
  });

  it('should create and retrieve journal entries', () => {
    const user = db.createUser('Test Student', 'NEET');
    const entry = db.createJournalEntry(user.id, 5, 6, 8, 'Stressed about physics mock.');

    expect(entry.userId).toBe(user.id);
    expect(entry.moodScore).toBe(5);
    expect(entry.sleepHours).toBe(6);
    expect(entry.studyHours).toBe(8);
    expect(entry.journalText).toBe('Stressed about physics mock.');

    const entries = db.getJournalEntries(user.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(entry.id);
  });

  it('should save and retrieve AI insights', () => {
    const user = db.createUser('Test Student', 'NEET');
    const entry = db.createJournalEntry(user.id, 5, 6, 8, 'Stressed about physics mock.');
    const mockInsight = {
      emotion: { primary: 'Anxiety', secondary: 'Fear', summary: 'Feeling anxious' },
      stressTrigger: ['Mock test'],
      burnoutRisk: { level: 'Medium' as const, reason: 'High study load' },
      recoveryPlan: ['Take a break'],
      futureMessage: 'You did great!'
    };

    const saved = db.saveAIInsight(user.id, entry.id, mockInsight);
    expect(saved.userId).toBe(user.id);
    expect(saved.journalId).toBe(entry.id);
    expect(saved.emotion.primary).toBe('Anxiety');

    const retrieved = db.getAIInsightForJournal(entry.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.emotion.primary).toBe('Anxiety');
  });
});
