// Stress Trigger Detection Service
// Identifies specific stress triggers from student metrics and journal text

export interface StressTrigger {
  category: 'academic' | 'sleep' | 'physical' | 'emotional' | 'social';
  trigger: string;
  severity: 'low' | 'moderate' | 'high';
  evidence: string;
}

/**
 * Detect stress triggers from student metrics and journal text.
 */
export function detectStressTriggers(
  moodScore: number,
  sleepHours: number,
  studyHours: number,
  journalText: string
): StressTrigger[] {
  const triggers: StressTrigger[] = [];
  const text = journalText.toLowerCase();

  // Sleep deprivation triggers
  if (sleepHours < 4) {
    triggers.push({
      category: 'sleep',
      trigger: 'Critical sleep deprivation',
      severity: 'high',
      evidence: `Only ${sleepHours} hours of sleep — severe cognitive impairment likely`
    });
  } else if (sleepHours < 6) {
    triggers.push({
      category: 'sleep',
      trigger: 'Inadequate sleep',
      severity: 'moderate',
      evidence: `${sleepHours} hours of sleep — below the recommended 7-8 hours`
    });
  }

  // Study overload triggers
  if (studyHours >= 12) {
    triggers.push({
      category: 'academic',
      trigger: 'Extreme study overload',
      severity: 'high',
      evidence: `${studyHours} hours of studying — diminishing returns and burnout territory`
    });
  } else if (studyHours >= 10) {
    triggers.push({
      category: 'academic',
      trigger: 'Extended study sessions',
      severity: 'moderate',
      evidence: `${studyHours} hours of studying — consider breaking into shorter focused blocks`
    });
  }

  // Low mood triggers
  if (moodScore <= 3) {
    triggers.push({
      category: 'emotional',
      trigger: 'Severe emotional distress',
      severity: 'high',
      evidence: `Mood score ${moodScore}/10 — indicates significant emotional burden`
    });
  } else if (moodScore <= 5) {
    triggers.push({
      category: 'emotional',
      trigger: 'Low emotional state',
      severity: 'moderate',
      evidence: `Mood score ${moodScore}/10 — emotional reserves may be depleted`
    });
  }

  // Journal text keyword analysis for specific triggers
  const keywordTriggers: Record<string, { category: StressTrigger['category']; trigger: string; severity: StressTrigger['severity'] }> = {
    'mock test': { category: 'academic', trigger: 'Mock test pressure', severity: 'moderate' },
    'failed': { category: 'emotional', trigger: 'Academic failure fear', severity: 'moderate' },
    'fail': { category: 'emotional', trigger: 'Failure anxiety', severity: 'moderate' },
    'cant crack': { category: 'emotional', trigger: 'Self-doubt and impostor syndrome', severity: 'high' },
    'can\'t crack': { category: 'emotional', trigger: 'Self-doubt and impostor syndrome', severity: 'high' },
    'nothing is sinking': { category: 'academic', trigger: 'Learning frustration', severity: 'moderate' },
    'parents': { category: 'social', trigger: 'Parental pressure', severity: 'moderate' },
    'comparison': { category: 'social', trigger: 'Social comparison', severity: 'moderate' },
    'syllabus': { category: 'academic', trigger: 'Syllabus coverage anxiety', severity: 'low' },
    'backlog': { category: 'academic', trigger: 'Backlog accumulation stress', severity: 'high' },
    'dropper': { category: 'emotional', trigger: 'Gap year pressure', severity: 'high' },
    'anxiety': { category: 'emotional', trigger: 'Clinical anxiety symptoms', severity: 'high' },
    'depressed': { category: 'emotional', trigger: 'Depression indicators', severity: 'high' },
    'sleepless': { category: 'sleep', trigger: 'Insomnia symptoms', severity: 'high' },
    'headache': { category: 'physical', trigger: 'Physical stress symptoms', severity: 'moderate' },
    'burnout': { category: 'emotional', trigger: 'Self-reported burnout', severity: 'high' },
    'give up': { category: 'emotional', trigger: 'Motivational crisis', severity: 'high' },
    'quit': { category: 'emotional', trigger: 'Desire to quit', severity: 'high' },
  };

  // Track matched trigger names to prevent duplicates
  const matchedTriggers = new Set<string>();

  for (const [keyword, triggerData] of Object.entries(keywordTriggers)) {
    if (text.includes(keyword) && !matchedTriggers.has(triggerData.trigger)) {
      matchedTriggers.add(triggerData.trigger);
      triggers.push({
        ...triggerData,
        evidence: `Detected keyword "${keyword}" in journal entry`
      });
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, moderate: 1, low: 2 };
  triggers.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return triggers;
}

/**
 * Generate a human-readable stress trigger report.
 */
export function formatTriggerReport(triggers: StressTrigger[]): string {
  if (triggers.length === 0) {
    return 'No significant stress triggers detected. Keep maintaining your wellness balance.';
  }

  const lines = ['Detected Stress Triggers:'];
  triggers.forEach((t, i) => {
    const severityIcon = t.severity === 'high' ? '🔴' : t.severity === 'moderate' ? '🟡' : '🟢';
    lines.push(`${i + 1}. ${severityIcon} ${t.trigger} (${t.category})`);
    lines.push(`   ${t.evidence}`);
  });
  return lines.join('\n');
}
