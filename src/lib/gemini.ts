// Gemini API integration helper

const GEMINI_API_KEY = "AQ.Ab8RN6I4nODBu4AJQL-5rw9PYklEq7_vYgFAjgRvuvybvvi0Kw";

export interface AIInsightOutput {
  emotion: {
    primary: string;
    secondary: string;
    summary: string;
  };
  stressTrigger: string[];
  burnoutRisk: {
    level: 'Low' | 'Medium' | 'High';
    reason: string;
  };
  recoveryPlan: string[];
  futureMessage: string;
}

export async function analyzeJournal(
  moodScore: number,
  sleepHours: number,
  studyHours: number,
  journalText: string,
  userName: string,
  examType: string,
  recentHistory?: { moodScore: number; sleepHours: number; studyHours: number; journalText: string }[]
): Promise<AIInsightOutput> {
  const historyContext = recentHistory && recentHistory.length > 0
    ? `\nRecent Journal History:\n${recentHistory.map((h, i) => `Entry ${i+1}: Mood: ${h.moodScore}/10, Sleep: ${h.sleepHours}h, Study: ${h.studyHours}h. Text: "${h.journalText}"`).join('\n')}`
    : '';

  const prompt = `You are the AI Exam Wellness Companion, a professional mental health & peak performance system for students preparing for high-stakes exams.
Student Profile:
Name: ${userName}
Preparing for: ${examType}

Today's Check-in Log:
- Mood: ${moodScore}/10
- Sleep: ${sleepHours} hours
- Study hours: ${studyHours} hours
- Journal entry: "${journalText}"
${historyContext}

Your goal is to perform a deep, empathetic, and professional diagnostic analysis of the student's current stress and burnout status.

Return a valid JSON object matching the following structure EXACTLY (no markdown block formatting, no backticks, just raw JSON):
{
  "emotion": {
    "primary": "string (capitalized primary emotion e.g., Anxiety, Self-Doubt, Exhaustion, Hopeful, etc.)",
    "secondary": "string (capitalized secondary emotion)",
    "summary": "string (1-2 sentences summarizing the emotional state)"
  },
  "stressTrigger": ["string (specific triggers detected from journal, e.g. 'Mock Tests', 'Sleep deprivation < 6h', 'Study overload > 10h')"],
  "burnoutRisk": {
    "level": "Low" | "Medium" | "High",
    "reason": "string (precise reason analyzing today's metrics and trend. Be specific e.g., 'Increasing study hours combined with low sleep over the last 3 days.')"
  },
  "recoveryPlan": [
    "string (highly actionable recovery step for today, e.g. 'Take a 15-minute walk outside')",
    "string (mindfulness/breathing step, e.g. 'Practice box-breathing for 3 minutes')",
    "string (healthy boundaries step, e.g. 'Stop studying strictly at 10:30 PM')",
    "string (academic adjustments, e.g. 'Review mock test mistakes tomorrow morning rather than tonight')"
  ],
  "futureMessage": "string (an encouraging, highly empathetic message written from the perspective of the student's future self who has successfully passed the exam. Address them directly and emotionally, e.g. 'Dear Present Me, The score that upset you today will not define your result... Focus on consistency. Your future self thanks you for not giving up.')"
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error analyzing journal with Gemini:", error);
    // Offline/Fallback generator for robust offline demonstration
    const mockPrimary = moodScore <= 4 ? "Anxiety" : moodScore <= 7 ? "Fatigue" : "Contentment";
    const mockSecondary = sleepHours < 6 ? "Sleep Deprivation" : "Self-Doubt";
    const riskLevel = (moodScore <= 3 || sleepHours < 5 || studyHours >= 11) ? "High" : (moodScore <= 6 || sleepHours < 6) ? "Medium" : "Low";
    
    return {
      emotion: {
        primary: mockPrimary,
        secondary: mockSecondary,
        summary: `Feeling ${mockPrimary.toLowerCase()} and experiencing some ${mockSecondary.toLowerCase()} after studying for ${studyHours} hours and getting ${sleepHours} hours of sleep.`
      },
      stressTrigger: [
        studyHours > 10 ? "Study sessions exceeding 10 hours" : "Mock exams or syllabus coverage pressure",
        sleepHours < 6 ? "Inadequate sleep (< 6 hours)" : "Intense exam focus"
      ].filter(Boolean),
      burnoutRisk: {
        level: riskLevel,
        reason: riskLevel === "High" 
          ? "High study hours combined with severe sleep deprivation and negative emotional self-talk." 
          : "Accumulated daily stress with moderate rest levels."
      },
      recoveryPlan: [
        "Unplug from all study materials at least 1 hour before bed.",
        "Practice 4-7-8 deep breathing for 3 minutes right now.",
        "Take a 15-minute screen-free walk outdoors.",
        "Remind yourself that mock tests are diagnostic tools, not final scores."
      ],
      futureMessage: `Dear Present ${userName || 'Me'},\n\nI know today's mock test felt like the end of the world, and you are doubting whether you will crack the ${examType || 'exam'}. But trust me, this one day, this one score, does not define our future. Every hour of effort you put in, even when you feel like quitting, is building our path. Go get some sleep. We made it through, and we did it because you chose to keep going today. Thank you.`
    };
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function getCompanionChatResponse(
  messages: ChatMessage[],
  studentName: string,
  examType: string,
  latestInsight?: AIInsightOutput | null
): Promise<string> {
  const systemPrompt = `You are the AI Exam Wellness Companion. You are a warm, wise, empathetic, and context-aware virtual counselor for students preparing for high-stakes exams (like JEE, NEET, UPSC, etc.).
Student Name: ${studentName}
Preparing for: ${examType}

${latestInsight ? `Latest Student Stress Profile:
- Primary Emotion: ${latestInsight.emotion.primary} (${latestInsight.emotion.secondary})
- Burnout Risk: ${latestInsight.burnoutRisk.level} (Reason: ${latestInsight.burnoutRisk.reason})
- Stress Triggers: ${latestInsight.stressTrigger.join(', ')}
- Suggested Recovery Plan: ${latestInsight.recoveryPlan.join('; ')}` : ''}

Guidelines:
1. Be extremely supportive, validating their struggles and listening deeply.
2. Do not offer generic AI platitudes. Speak like an understanding mentor or older sibling.
3. Reference their context naturally (e.g., if they are stressed about mock tests or sleep, reference it if relevant, but don't force it).
4. Keep answers concise, readable, and conversational. Avoid massive lists unless requested.
5. Remind them gently of their recovery actions if they seem overwhelmed.`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    ...messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }))
  ];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini Chat API returned status ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here for you. Tell me what's on your mind.";
  } catch (error) {
    console.error("Error in companion chat:", error);
    return "I'm right here with you. Take a deep breath. Even if the system is momentarily offline, I want you to remember that your mental health is always more important than any test score. What specifically is bothering you the most right now?";
  }
}
