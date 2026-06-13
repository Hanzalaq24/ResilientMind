import { describe, it, expect } from 'vitest';
import { getAdaptiveMindfulness, allExercises } from '../services/adaptiveMindfulness';

describe('Adaptive Mindfulness', () => {
  describe('getAdaptiveMindfulness', () => {
    it('returns at least one exercise', () => {
      const result = getAdaptiveMindfulness(7, 7, 8);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns breathing exercise for high anxiety mood', () => {
      const result = getAdaptiveMindfulness(2, 5, 10, 'Anxiety');
      const breathing = result.filter(e => e.category === 'breathing');
      expect(breathing.length).toBeGreaterThan(0);
    });

    it('includes movement exercise for long study hours', () => {
      const result = getAdaptiveMindfulness(5, 7, 12, 'Fatigue');
      const movement = result.filter(e => e.category === 'movement');
      expect(movement.length).toBeGreaterThan(0);
    });

    it('includes grounding exercise for low sleep', () => {
      const result = getAdaptiveMindfulness(5, 3, 8, 'Stress');
      const grounding = result.filter(e => e.category === 'grounding');
      expect(grounding.length).toBeGreaterThan(0);
    });

    it('includes cognitive exercise for very low mood', () => {
      const result = getAdaptiveMindfulness(2, 5, 9, 'Fear');
      const cognitive = result.filter(e => e.category === 'cognitive');
      expect(cognitive.length).toBeGreaterThan(0);
    });

    it('limits recommendations to 4', () => {
      const result = getAdaptiveMindfulness(2, 2, 15, 'Anxiety');
      expect(result.length).toBeLessThanOrEqual(4);
    });

    it('returns exercises with valid structure', () => {
      const result = getAdaptiveMindfulness(6, 7, 8);
      result.forEach(ex => {
        expect(ex.name).toBeTruthy();
        expect(ex.duration).toBeTruthy();
        expect(ex.description).toBeTruthy();
        expect(['breathing', 'grounding', 'movement', 'cognitive']).toContain(ex.category);
      });
    });
  });

  describe('allExercises', () => {
    it('has at least 8 exercises', () => {
      expect(allExercises.length).toBeGreaterThanOrEqual(8);
    });

    it('has exercises in all categories', () => {
      const categories = new Set(allExercises.map(e => e.category));
      expect(categories.has('breathing')).toBe(true);
      expect(categories.has('grounding')).toBe(true);
      expect(categories.has('movement')).toBe(true);
      expect(categories.has('cognitive')).toBe(true);
    });
  });
});
