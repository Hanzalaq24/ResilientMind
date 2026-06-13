// Burnout Risk Calculation Service
// Pure functions for calculating burnout risk from student metrics

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface BurnoutRiskResult {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
}

/**
 * Calculate burnout risk score from student metrics.
 * Score ranges: 0-33 Low, 34-66 Medium, 67-100 High
 */
export function calculateBurnoutRisk(
  moodScore: number,      // 1-10
  sleepHours: number,     // 0-24
  studyHours: number,     // 0-24
  recentHistory?: { moodScore: number; sleepHours: number; studyHours: number }[]
): BurnoutRiskResult {
  let score = 0;
  const factors: string[] = [];

  // Mood factor (0-30 points)
  if (moodScore <= 2) {
    score += 30;
    factors.push('Severely low mood indicates emotional exhaustion');
  } else if (moodScore <= 4) {
    score += 22;
    factors.push('Low mood suggests increased stress burden');
  } else if (moodScore <= 6) {
    score += 12;
    factors.push('Moderate mood — room for improvement');
  }

  // Sleep factor (0-30 points)
  if (sleepHours < 4) {
    score += 30;
    factors.push('Critical sleep deprivation (< 4 hours)');
  } else if (sleepHours < 6) {
    score += 22;
    factors.push('Inadequate sleep (< 6 hours) impairs recovery');
  } else if (sleepHours < 7) {
    score += 10;
    factors.push('Below-optimal sleep (< 7 hours)');
  }

  // Study overload factor (0-25 points)
  if (studyHours >= 14) {
    score += 25;
    factors.push('Extreme study load (14+ hours) — high burnout risk');
  } else if (studyHours >= 11) {
    score += 20;
    factors.push('Heavy study load (11+ hours) without adequate rest');
  } else if (studyHours >= 10) {
    score += 10;
    factors.push('Extended study sessions (10+ hours)');
  }

  // Trend factor (0-15 points) — worsening patterns increase risk
  if (recentHistory && recentHistory.length >= 2) {
    const recent = recentHistory.slice(0, 3);
    const avgMood = recent.reduce((s, h) => s + h.moodScore, 0) / recent.length;
    const avgSleep = recent.reduce((s, h) => s + h.sleepHours, 0) / recent.length;
    const avgStudy = recent.reduce((s, h) => s + h.studyHours, 0) / recent.length;

    if (avgMood < moodScore || avgSleep > sleepHours || avgStudy < studyHours) {
      // Situation is worsening compared to recent average
      score += 15;
      factors.push('Declining trend detected across recent entries');
    } else if (moodScore > avgMood + 1 && sleepHours >= avgSleep) {
      // Improving trend — reduce score
      score -= 5;
      factors.push('Positive recovery trend detected');
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: RiskLevel;
  if (score >= 67) {
    level = 'High';
  } else if (score >= 34) {
    level = 'Medium';
  } else {
    level = 'Low';
  }

  return { level, score, factors };
}
