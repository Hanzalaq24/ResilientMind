// Adaptive Mindfulness Service
// Recommends personalized mindfulness exercises based on current state

export interface MindfulnessExercise {
  name: string;
  duration: string;
  description: string;
  category: 'breathing' | 'grounding' | 'movement' | 'cognitive';
  forEmotion: string;
}

const exercises: MindfulnessExercise[] = [
  // Breathing exercises
  {
    name: 'Box Breathing',
    duration: '3 minutes',
    description: 'Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4. Repeat 6 cycles.',
    category: 'breathing',
    forEmotion: 'Anxiety'
  },
  {
    name: '4-7-8 Relaxation',
    duration: '4 minutes',
    description: 'Inhale through nose for 4 seconds, hold for 7, exhale through mouth for 8. Activates parasympathetic nervous system.',
    category: 'breathing',
    forEmotion: 'Stress'
  },
  {
    name: 'Physiological Sigh',
    duration: '1 minute',
    description: 'Double inhale through nose (short + long), then extended exhale through mouth. Fastest known way to calm the nervous system.',
    category: 'breathing',
    forEmotion: 'Panic'
  },
  // Grounding exercises
  {
    name: '5-4-3-2-1 Grounding',
    duration: '5 minutes',
    description: 'Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste. Anchors you to the present moment.',
    category: 'grounding',
    forEmotion: 'Overwhelm'
  },
  {
    name: 'Body Scan',
    duration: '7 minutes',
    description: 'Starting from toes, slowly bring awareness to each body part. Notice tension without judgment. Release with each exhale.',
    category: 'grounding',
    forEmotion: 'Fatigue'
  },
  // Movement exercises
  {
    name: 'Desk Stretching',
    duration: '5 minutes',
    description: 'Neck rolls, shoulder shrugs, wrist circles, seated spinal twist. Releases physical tension from prolonged studying.',
    category: 'movement',
    forEmotion: 'Physical Tension'
  },
  {
    name: 'Walking Reset',
    duration: '10 minutes',
    description: 'Walk slowly without your phone. Focus on footfalls and breath. Change of environment resets cognitive load.',
    category: 'movement',
    forEmotion: 'Mental Fatigue'
  },
  // Cognitive exercises
  {
    name: 'Worst-Case Reframe',
    duration: '5 minutes',
    description: 'Write down your worst fear about the exam. Then write the most likely outcome. Then the best case. Reality is usually between worst and likely.',
    category: 'cognitive',
    forEmotion: 'Fear'
  },
  {
    name: 'Gratitude Micro-Journal',
    duration: '3 minutes',
    description: 'Write 3 specific things that went well today, no matter how small. This rewires the brain toward positive pattern recognition.',
    category: 'cognitive',
    forEmotion: 'Hopelessness'
  },
  {
    name: 'Future Self Visualization',
    duration: '5 minutes',
    description: 'Close your eyes. Imagine yourself 6 months after the exam, happy and successful. What does that version of you say to present you?',
    category: 'cognitive',
    forEmotion: 'Self-Doubt'
  }
];

/**
 * Get adaptive mindfulness recommendations based on current emotional state.
 */
export function getAdaptiveMindfulness(
  moodScore: number,
  sleepHours: number,
  studyHours: number,
  primaryEmotion?: string
): MindfulnessExercise[] {
  const recommendations: MindfulnessExercise[] = [];
  const emotionKey = primaryEmotion || '';

  // Match by emotion keyword
  const emotionMap: Record<string, string[]> = {
    'Anxiety': ['Anxiety', 'Stress', 'Panic'],
    'Stress': ['Stress', 'Anxiety', 'Overwhelm'],
    'Fatigue': ['Fatigue', 'Mental Fatigue', 'Physical Tension'],
    'Exhaustion': ['Fatigue', 'Physical Tension', 'Mental Fatigue'],
    'Fear': ['Fear', 'Anxiety'],
    'Self-Doubt': ['Self-Doubt', 'Hopelessness'],
    'Hopelessness': ['Hopelessness', 'Self-Doubt'],
    'Contentment': ['Gratitude Micro-Journal'],
    'Overwhelm': ['Overwhelm', 'Panic', 'Anxiety'],
  };

  const targetEmotions = emotionMap[emotionKey] || ['Stress', 'Anxiety'];

  // Find matching exercises
  for (const target of targetEmotions) {
    const match = exercises.find(e => e.forEmotion === target);
    if (match && !recommendations.some(r => r.name === match.name)) {
      recommendations.push(match);
    }
  }

  // Add context-based recommendations
  if (sleepHours < 6) {
    const sleepEx = exercises.find(e => e.name === 'Body Scan');
    if (sleepEx && !recommendations.some(r => r.name === sleepEx.name)) {
      recommendations.push(sleepEx);
    }
  }

  if (studyHours >= 10) {
    const movementEx = exercises.find(e => e.name === 'Walking Reset');
    if (movementEx && !recommendations.some(r => r.name === movementEx.name)) {
      recommendations.push(movementEx);
    }
  }

  if (moodScore <= 4) {
    const cognitiveEx = exercises.find(e => e.name === 'Worst-Case Reframe');
    if (cognitiveEx && !recommendations.some(r => r.name === cognitiveEx.name)) {
      recommendations.push(cognitiveEx);
    }
  }

  // Always include at least one breathing exercise
  if (!recommendations.some(r => r.category === 'breathing')) {
    const breathEx = exercises.find(e => e.name === 'Box Breathing');
    if (breathEx) recommendations.push(breathEx);
  }

  return recommendations.slice(0, 4); // Return top 4 recommendations
}

export { exercises as allExercises };
