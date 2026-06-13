// Emotional Pattern Analysis Service
// Analyzes emotional trends across journal entries over time

export interface EmotionalPattern {
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  dominantEmotion: string;
  triggers: string[];
  insight: string;
}

export interface HistoryEntry {
  moodScore: number;
  sleepHours: number;
  studyHours: number;
  journalText: string;
  createdAt: string;
  emotion?: string;
}

/**
 * Analyze emotional patterns across multiple journal entries.
 */
export function analyzeEmotionalPatterns(history: HistoryEntry[]): EmotionalPattern | null {
  if (history.length < 2) {
    return null;
  }

  const recent = history.slice(0, Math.min(7, history.length));
  const moods = recent.map(h => h.moodScore);
  const sleeps = recent.map(h => h.sleepHours);
  const studies = recent.map(h => h.studyHours);

  // Calculate trend
  const moodTrend = calculateTrend(moods);
  const sleepTrend = calculateTrend(sleeps);
  const studyTrend = calculateTrend(studies);

  let trend: EmotionalPattern['trend'];
  if (moodTrend > 0.3 && sleepTrend >= -0.1) {
    trend = 'improving';
  } else if (moodTrend < -0.3 || (sleepTrend < -0.5 && studyTrend > 0.3)) {
    trend = 'declining';
  } else if (Math.abs(moodTrend) > 0.5 || Math.abs(sleepTrend) > 0.5) {
    trend = 'volatile';
  } else {
    trend = 'stable';
  }

  // Dominant emotion from mood scores
  const avgMood = moods.reduce((s, m) => s + m, 0) / moods.length;
  let dominantEmotion: string;
  if (avgMood <= 3) dominantEmotion = 'Distress';
  else if (avgMood <= 5) dominantEmotion = 'Fatigue';
  else if (avgMood <= 7) dominantEmotion = 'Neutral';
  else dominantEmotion = 'Resilience';

  // Identify pattern-based triggers
  const triggers: string[] = [];
  if (sleepTrend < -0.3 && studyTrend > 0.2) {
    triggers.push('Increasing study hours correlate with declining sleep quality');
  }
  if (moodTrend < -0.2 && studies[0] > 10) {
    triggers.push('Extended study sessions may be causing emotional decline');
  }
  if (moods.filter(m => m <= 4).length >= 3) {
    triggers.push('Frequent low-mood episodes suggest cumulative stress');
  }
  if (sleeps.filter(s => s < 6).length >= 3) {
    triggers.push('Persistent sleep deprivation across multiple days');
  }

  // Generate insight
  const insight = generateInsight(trend, dominantEmotion, avgMood, recent.length);

  return { trend, dominantEmotion, triggers, insight };
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const indices = values.map((_, i) => i);
  const meanX = indices.reduce((s, x) => s + x, 0) / n;
  const meanY = values.reduce((s, y) => s + y, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (indices[i] - meanX) * (values[i] - meanY);
    denominator += (indices[i] - meanX) ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

function generateInsight(
  trend: EmotionalPattern['trend'],
  _emotion: string,
  avgMood: number,
  days: number
): string {
  switch (trend) {
    case 'improving':
      return `Over the last ${days} days, your emotional trajectory is positive. Your average mood of ${avgMood.toFixed(1)}/10 suggests growing resilience. Keep the momentum — this pattern shows your coping strategies are working.`;
    case 'declining':
      return `Your emotional pattern shows a declining trend over ${days} days. This often precedes burnout. Consider reducing study intensity, prioritizing sleep, and using the recovery plan to stabilize.`;
    case 'volatile':
      return `Your mood has been fluctuating significantly over ${days} days. Volatile emotional patterns often indicate that external pressures are overwhelming your current coping capacity. Focus on consistency in sleep and breaks.`;
    case 'stable':
      return `Your emotional state has been relatively stable over ${days} days with an average mood of ${avgMood.toFixed(1)}/10. Stability is a foundation — now look for opportunities to build upward momentum.`;
  }
}
