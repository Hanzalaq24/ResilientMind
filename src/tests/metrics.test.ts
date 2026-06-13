import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeJournal } from '../lib/gemini';

describe('AI Insight Fallback Metrics', () => {
  beforeEach(() => {
    // Stub fetch to throw error to test fallback path
    global.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('Network offline')));
  });

  it('should generate High Burnout Risk fallback when mood is extremely low, sleep is low, and study is high', async () => {
    // Calling with an invalid key to trigger fallback logic
    const { insight, isFallback } = await analyzeJournal('INVALID_KEY', 2, 4, 12, 'I am totally burned out and failed my mocks.', 'John', 'JEE');
    
    expect(isFallback).toBe(true);
    expect(insight).toBeDefined();
    expect(insight.burnoutRisk.level).toBe('High');
    expect(insight.emotion.primary).toBe('Anxiety');
    expect(insight.stressTrigger).toContain('Study sessions exceeding 10 hours');
    expect(insight.stressTrigger).toContain('Inadequate sleep (< 6 hours)');
  });

  it('should generate Low Burnout Risk fallback when mood is high and metrics are healthy', async () => {
    const { insight, isFallback } = await analyzeJournal('INVALID_KEY', 8, 8, 5, 'Doing well, finished my daily goals.', 'John', 'JEE');
    
    expect(isFallback).toBe(true);
    expect(insight).toBeDefined();
    expect(insight.burnoutRisk.level).toBe('Low');
    expect(insight.emotion.primary).toBe('Contentment');
    expect(insight.stressTrigger).not.toContain('Study sessions exceeding 10 hours');
  });
});
