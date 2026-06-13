# ResilientMind — Mental Wellness Journal for JEE/NEET Students

A full-stack mental wellness application built with React, TypeScript, and Vite. Features AI-powered insights via Gemini API, burnout risk analysis, stress trigger detection, emotional pattern tracking, and adaptive mindfulness recommendations.

## Features

- **Daily Check-in** — Log mood, sleep, study hours, and journal entries
- **AI Insights** — Gemini-powered analysis of mental state with fallback analysis when offline
- **Burnout Risk Score** — 0-100 numeric score with contributing factors breakdown
- **Stress Trigger Detection** — Keyword-based analysis identifying academic, sleep, physical, emotional, and social stressors
- **Emotional Pattern Analysis** — Trend detection (improving/declining/stable/volatile) across multiple entries
- **Adaptive Mindfulness** — Personalized exercises (breathing/grounding/movement/cognitive) based on current state
- **Chat Companion** — AI-powered mental health support chat with rate limiting
- **Dark/Light Theme** — Toggle between themes with persistent preference
- **Offline Support** — Graceful fallback when API is unavailable

## Project Structure

```
src/
├── services/
│   ├── burnoutAnalysis.ts      — Burnout risk scoring (pure function)
│   ├── stressDetection.ts      — Keyword-based stress trigger detection
│   ├── emotionalPatterns.ts    — Trend analysis with linear regression
│   ├── adaptiveMindfulness.ts  — Context-aware exercise recommendations
│   ├── rateLimiter.ts          — Sliding window rate limiter
│   └── validators.ts           — Input validation and sanitization
├── components/
│   ├── StressTrendChart.tsx    — Stress trend visualization
│   └── ...                     — Other UI components
├── lib/
│   ├── gemini.ts               — Gemini API integration with fallback
│   └── db.ts                   — localStorage CRUD layer
├── tests/
│   ├── burnoutAnalysis.test.ts — 10 tests
│   ├── stressDetection.test.ts — 13 tests
│   ├── emotionalPatterns.test.ts — 8 tests
│   ├── adaptiveMindfulness.test.ts — 9 tests
│   ├── rateLimiter.test.ts     — 7 tests
│   ├── validators.test.ts      — 31 tests
│   ├── sanitizer.test.ts       — 12 tests
│   ├── db.test.ts              — 3 tests
│   └── metrics.test.ts         — 2 tests
└── App.tsx                     — Main application component
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Environment Variables

Create a `.env` file:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Get a valid API key from [Google AI Studio](https://aistudio.google.com/apikey). Keys must start with `AIza`.

## Testing

95 tests across 9 test files covering:

| Module | Tests | Coverage |
|--------|-------|----------|
| Burnout Analysis | 10 | Risk scoring, edge cases, contributing factors |
| Stress Detection | 13 | Keyword analysis, severity sorting, deduplication |
| Emotional Patterns | 8 | Trend detection, pattern analysis |
| Adaptive Mindfulness | 9 | Exercise selection, context awareness |
| Rate Limiter | 7 | Sliding window, key isolation, reset |
| Validators | 31 | API key format, mood/sleep/study validation |
| Sanitizer | 12 | XSS prevention |
| Database | 3 | CRUD operations |
| Metrics | 2 | Gemini fallback |

## Security

- **API Key Validation** — Format validation (`AIza` prefix) before API calls
- **Input Validation** — All user inputs validated (mood 1-10, sleep 0-24, study 0-24)
- **Rate Limiting** — 20 requests/minute sliding window for chat
- **CSP Headers** — Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
- **XSS Prevention** — HTML sanitization on all user inputs

## Accessibility

- Skip navigation link for keyboard users
- ARIA roles on all major sections (banner, main, navigation, etc.)
- ARIA live regions for dynamic content updates
- Descriptive labels on all interactive elements
- Focus-visible styles for keyboard navigation
- Screen reader-only text for context

## Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8
- **AI**: Google Gemini API
- **Testing**: Vitest
- **Styling**: CSS with custom properties
- **Storage**: localStorage
