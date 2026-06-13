import React, { useState, useEffect, useRef } from 'react';
import { db } from './lib/db';
import type { User as UserType, JournalEntry, AIInsight } from './lib/db';
import { analyzeJournal, getCompanionChatResponse } from './lib/gemini';
import type { ChatMessage } from './lib/gemini';
import StressTrendChart from './components/StressTrendChart';
import { sanitizeInput, validateCheckIn } from './services/validators';
import { detectStressTriggers, formatTriggerReport } from './services/stressDetection';
import { analyzeEmotionalPatterns } from './services/emotionalPatterns';
import { getAdaptiveMindfulness } from './services/adaptiveMindfulness';
import { isRateLimited } from './services/rateLimiter';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [examTypeInput, setExamTypeInput] = useState('JEE');

  // Daily check-in state
  const [mood, setMood] = useState(7);
  const [sleep, setSleepHours] = useState(7);
  const [study, setStudyHours] = useState(8);
  const [journalText, setJournalText] = useState('');

  // Navigation
  const [view, setView] = useState<'form' | 'loading' | 'insight' | 'chat'>('form');
  const [loadingText, setLoadingText] = useState('Analyzing your wellbeing...');
  const [activeInsight, setActiveInsight] = useState<AIInsight | null>(null);
  const [activeJournalEntry, setActiveJournalEntry] = useState<JournalEntry | null>(null);
  const [historyEntries, setHistoryEntries] = useState<{ entry: JournalEntry; insight: AIInsight | null }[]>([]);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInputMessage, setUserInputMessage] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Gemini connection state
  const [geminiConnected, setGeminiConnected] = useState<boolean | null>(null);

  // Analysis state
  const [stressTriggerReport, setStressTriggerReport] = useState('');
  const [emotionalPattern, setEmotionalPattern] = useState<ReturnType<typeof analyzeEmotionalPatterns>>(null);
  const [mindfulnessExercises, setMindfulnessExercises] = useState<ReturnType<typeof getAdaptiveMindfulness>>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = db.getCurrentUser();
    // Load key from env if not in db
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const savedKey = db.getApiKey();
    if (!savedKey && envKey) {
      db.saveApiKey(envKey);
    }
    if (user) {
      setCurrentUser(user);
      loadHistory(user.id);
    }
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatTyping]);

  const loadHistory = (userId: string) => {
    const entries = db.getJournalEntries(userId);
    const mapped = entries.map(entry => {
      const insight = db.getAIInsightForJournal(entry.id);
      return { entry, insight };
    });
    setHistoryEntries(mapped);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const safeName = sanitizeInput(nameInput);
    const user = db.createUser(safeName, examTypeInput);
    setCurrentUser(user);
    loadHistory(user.id);
  };

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    setHistoryEntries([]);
    setActiveInsight(null);
    setActiveJournalEntry(null);
    setView('form');
  };

  const handleAnalyze = async () => {
    if (!currentUser) return;
    const key = db.getApiKey();

    // Validate inputs
    const validation = validateCheckIn({ mood, sleep, study, journalText });
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    setView('loading');
    setLoadingText('Gemini is analyzing your emotional markers...');

    try {
      const safeJournalText = sanitizeInput(journalText);

      const entry = db.createJournalEntry(currentUser.id, mood, sleep, study, safeJournalText);

      const recentHistoryData = historyEntries.slice(0, 5).map(h => ({
        moodScore: h.entry.moodScore,
        sleepHours: h.entry.sleepHours,
        studyHours: h.entry.studyHours,
        journalText: h.entry.journalText,
      }));

      setLoadingText('Detecting hidden stress triggers and predicting burnout risk...');
      const { insight: aiResult, isFallback } = await analyzeJournal(
        key,
        mood,
        sleep,
        study,
        journalText.trim(),
        currentUser.name,
        currentUser.examType,
        recentHistoryData
      );

      setGeminiConnected(!isFallback);
      const insight = db.saveAIInsight(currentUser.id, entry.id, aiResult);
      setActiveJournalEntry(entry);
      setActiveInsight(insight);
      loadHistory(currentUser.id);

      // Run client-side analysis services
      const triggers = detectStressTriggers(mood, sleep, study, journalText.trim());
      setStressTriggerReport(formatTriggerReport(triggers));

      const allHistory = historyEntries.map(h => ({
        moodScore: h.entry.moodScore,
        sleepHours: h.entry.sleepHours,
        studyHours: h.entry.studyHours,
        journalText: h.entry.journalText,
        createdAt: h.entry.createdAt,
        emotion: h.insight?.emotion.primary,
      }));
      setEmotionalPattern(analyzeEmotionalPatterns(allHistory));
      setMindfulnessExercises(getAdaptiveMindfulness(mood, sleep, study, aiResult.emotion.primary));

      setJournalText('');
      setMood(7);
      setSleepHours(7);
      setStudyHours(8);
      setView('insight');
    } catch (err) {
      console.error(err);
      setView('form');
      alert('Failed to analyze. Please check your Gemini API Key in .env and try again.');
    }
  };

  const fillDemoScenario = () => {
    setMood(3);
    setSleepHours(4);
    setStudyHours(11);
    setJournalText("My mock test went terribly. I don't think I can crack JEE. I've been studying 11 hours but nothing is sinking in.");
  };

  const selectHistoryItem = (item: { entry: JournalEntry; insight: AIInsight | null }) => {
    setActiveJournalEntry(item.entry);
    setActiveInsight(item.insight);
    if (item.insight) setView('insight');
  };

  const startCompanionChat = async () => {
    if (!currentUser) return;
    setChatMessages([]);
    setView('chat');
    setIsChatTyping(true);
    try {
      const key = db.getApiKey();
      const greetingPrompt = activeInsight
        ? `Greet ${currentUser.name} warmly as their AI Exam Wellness Companion. They just completed a wellness check-in. Reference these specific findings naturally in your greeting: their primary emotion is ${activeInsight.emotion.primary}, burnout risk is ${activeInsight.burnoutRisk.level}, and their stress triggers include ${activeInsight.stressTrigger.join(', ')}. Ask how they are feeling and invite them to talk. Keep it warm, personal, and under 4 sentences.`
        : `Greet ${currentUser.name} warmly as their AI Exam Wellness Companion. Ask how they are feeling today and invite them to share. Keep it warm and under 3 sentences.`;

      const { content, isFallback } = await getCompanionChatResponse(
        key,
        [{ role: 'user', content: greetingPrompt }],
        currentUser.name,
        currentUser.examType,
        activeInsight
      );
      setGeminiConnected(prev => prev === null ? !isFallback : prev && !isFallback);
      setChatMessages([{ role: 'model', content }]);
    } catch (err) {
      console.error(err);
      let contextGreeting = "Hey! I'm your AI Wellness Companion. How are you feeling right now?";
      if (activeInsight) {
        const triggers = activeInsight.stressTrigger.join(' and ');
        contextGreeting = `Hi ${currentUser.name}! I noticed ${triggers || 'some stress patterns'} affecting you, with a ${activeInsight.burnoutRisk.level} burnout risk. Want to talk about it?`;
      }
      setChatMessages([{ role: 'model', content: contextGreeting }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInputMessage.trim() || !currentUser) return;

    // Rate limit check
    if (isRateLimited('chat-api', 20, 60000)) {
      setChatMessages(prev => [...prev, { role: 'model' as const, content: "You're sending messages too quickly. Please wait a moment before trying again." }]);
      return;
    }

    const userMsg = sanitizeInput(userInputMessage);
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(updatedMessages);
    setUserInputMessage('');
    setIsChatTyping(true);
    try {
      const key = db.getApiKey();
      const { content, isFallback } = await getCompanionChatResponse(key, updatedMessages, currentUser.name, currentUser.examType, activeInsight);
      setGeminiConnected(prev => prev === null ? !isFallback : prev && !isFallback);
      setChatMessages([...updatedMessages, { role: 'model' as const, content }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatTyping(false);
    }
  };

  // ─── ONBOARDING SCREEN ─────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="rm-app">
        <a href="#main-content" className="rm-skip-link">Skip to main content</a>
        <header className="rm-nav" role="banner">
          <div className="rm-nav-inner">
            <div className="rm-brand">
              <div className="rm-brand-icon" aria-hidden="true">R</div>
              <span>ResilientMind</span>
            </div>
          </div>
        </header>
        <main id="main-content" className="rm-onboarding" role="main">
          <div className="rm-onboarding-hero">
            <div className="rm-badge">AI-Powered · Exam Wellness</div>
            <h1 className="rm-hero-title">Your cognitive sanctuary<br />for exam success</h1>
            <p className="rm-hero-sub">
              Detect stress early, prevent burnout, and stay emotionally resilient during JEE, NEET, UPSC, CAT, GATE and board exam preparation.
            </p>
          </div>
          <div className="rm-card rm-onboard-card">
            <h2 className="rm-card-title">Begin your journey</h2>
            <form onSubmit={handleRegister} className="rm-form" aria-label="Student registration form">
              <div className="rm-field">
                <label className="rm-label" htmlFor="student-name">Your Name</label>
                <input
                  type="text"
                  id="student-name"
                  className="rm-input"
                  placeholder="Enter your name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="name"
                />
              </div>
              <div className="rm-field">
                <label className="rm-label" htmlFor="exam-select">Target Exam</label>
                <select
                  id="exam-select"
                  className="rm-input rm-select"
                  value={examTypeInput}
                  onChange={(e) => setExamTypeInput(e.target.value)}
                  aria-required="true"
                >
                  <option value="JEE">JEE Main &amp; Advanced</option>
                  <option value="NEET">NEET UG</option>
                  <option value="UPSC">UPSC Civil Services</option>
                  <option value="CAT">CAT (MBA Entrance)</option>
                  <option value="GATE">GATE</option>
                  <option value="Board Exams">10th / 12th Board Exams</option>
                </select>
              </div>
              <button type="submit" className="rm-btn-primary" aria-label="Get started with ResilientMind">
                Get Started
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </form>
            <button className="rm-btn-ghost" onClick={fillDemoScenario} aria-label="Auto-fill demo scenario with sample data">
              ⚡ Auto-fill Demo Scenario
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── LOADING SCREEN ────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="rm-app">
        <header className="rm-nav" role="banner">
          <div className="rm-nav-inner">
            <div className="rm-brand">
              <div className="rm-brand-icon" aria-hidden="true">R</div>
              <span>ResilientMind</span>
            </div>
          </div>
        </header>
        <main className="rm-loading-screen" role="main" aria-live="polite" aria-label="Loading AI analysis">
          <div className="rm-pulse-ring" aria-hidden="true"></div>
          <div className="rm-loading-icon" aria-hidden="true">✦</div>
          <p className="rm-loading-title">{loadingText}</p>
          <p className="rm-loading-sub">Using Gemini AI to identify stress biomarkers</p>
        </main>
      </div>
    );
  }

  // ─── MAIN APP ──────────────────────────────────────────────────────────────
  return (
    <div className="rm-app">
      <a href="#main-content" className="rm-skip-link">Skip to main content</a>
      {/* Nav */}
      <header className="rm-nav" role="banner">
        <div className="rm-nav-inner">
          <div className="rm-brand">
            <div className="rm-brand-icon" aria-hidden="true">R</div>
            <span>ResilientMind</span>
          </div>
          <nav className="rm-nav-links" role="navigation" aria-label="Main navigation">
            <span className="rm-nav-user" aria-label={`Logged in as ${currentUser.name}, preparing for ${currentUser.examType}`}>
              {currentUser.name} · {currentUser.examType}
            </span>
            <button
              className="rm-nav-btn"
              onClick={handleLogout}
              aria-label="Sign out of your account"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {geminiConnected === false && (
        <div className="rm-banner-warning" role="alert" aria-live="assertive">
          <span className="rm-banner-icon" aria-hidden="true">⚠️</span>
          <div>
            <strong>Gemini API is not connected.</strong> Showing offline fallback responses. Check your API key in <code>.env</code> (must start with <code>AIza</code>).
          </div>
        </div>
      )}

      <main id="main-content" className="rm-main" role="main">
        {/* ── DAILY CHECK-IN VIEW ── */}
        {view === 'form' && (
          <div className="rm-dashboard">
            {/* Left: Check-in form */}
            <div className="rm-checkin-col">
              <section className="rm-checkin-hero">
                <h1 className="rm-page-title">Today's Reflection</h1>
                <p className="rm-page-sub">Take a moment for yourself. Your wellness drives your performance.</p>
              </section>

              <div className="rm-card rm-checkin-card">
                <div className="rm-card-top">
                  <span className="rm-card-label">Daily Wellness Log</span>
                  <button className="rm-btn-ghost-sm" onClick={fillDemoScenario} aria-label="Auto-fill form with demo data">⚡ Demo</button>
                </div>

                {/* Mood Slider */}
                <div className="rm-field-block">
                  <div className="rm-field-row">
                    <label className="rm-field-heading" htmlFor="mood-slider">How's your mood today?</label>
                    <span className={`rm-val-chip ${mood <= 3 ? 'rm-chip-low' : mood <= 7 ? 'rm-chip-mid' : 'rm-chip-high'}`} aria-live="polite">{mood}/10</span>
                  </div>
                  <input
                    type="range" id="mood-slider" min="1" max="10"
                    className="rm-slider" value={mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    aria-label={`Mood level: ${mood} out of 10`}
                    aria-valuemin={1} aria-valuemax={10} aria-valuenow={mood}
                    aria-describedby="mood-description"
                  />
                  <p id="mood-description" className="sr-only">Slide to rate your mood from 1 (Exhausted) to 10 (Energized)</p>
                  <div className="rm-slider-labels" aria-hidden="true">
                    <span>Exhausted</span><span>Calm</span><span>Energized</span>
                  </div>
                </div>

                {/* Sleep + Study grid */}
                <div className="rm-stats-grid">
                  <div className="rm-field-block">
                    <label className="rm-stat-label" htmlFor="sleep-input">
                      <span className="rm-stat-icon" aria-hidden="true">🌙</span> Hours of Sleep
                    </label>
                    <input
                      type="number" id="sleep-input" className="rm-input rm-stat-input"
                      min="0" max="24" value={sleep}
                      onChange={(e) => setSleepHours(Number(e.target.value))}
                      aria-label={`Sleep hours: ${sleep}`}
                      aria-describedby="sleep-help"
                    />
                    <p id="sleep-help" className="sr-only">Enter the number of hours you slept last night, between 0 and 24</p>
                  </div>
                  <div className="rm-field-block">
                    <label className="rm-stat-label" htmlFor="study-input">
                      <span className="rm-stat-icon" aria-hidden="true">📚</span> Study Hours
                    </label>
                    <input
                      type="number" id="study-input" className="rm-input rm-stat-input"
                      min="0" max="24" value={study}
                      onChange={(e) => setStudyHours(Number(e.target.value))}
                      aria-label={`Study hours: ${study}`}
                      aria-describedby="study-help"
                    />
                    <p id="study-help" className="sr-only">Enter the total hours you studied today, between 0 and 24</p>
                  </div>
                </div>

                {/* Journal */}
                <div className="rm-field-block">
                  <label className="rm-field-heading" htmlFor="journal-input">How are you feeling today?</label>
                  <textarea
                    id="journal-input" rows={5} className="rm-textarea"
                    placeholder="Aaj Physics mock test kharab gaya. Bahut demotivated feel kar raha hu..."
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    aria-describedby="journal-hint"
                    aria-required="true"
                  />
                  <p id="journal-hint" className="rm-field-hint">Writing down frustrations helps clear cognitive space for better learning. Minimum 10 characters.</p>
                </div>

                {/* CTA */}
                <div className="rm-cta-wrapper">
                  <div className="rm-cta-glow" aria-hidden="true"></div>
                  <button className="rm-btn-primary rm-btn-full" onClick={handleAnalyze} aria-label="Analyze my wellbeing with AI" disabled={!journalText.trim()}>
                    Analyze My Wellbeing
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </button>
                </div>

                {/* AI tip card */}
                <div className="rm-tip-card">
                  <span className="rm-tip-icon" aria-hidden="true">💡</span>
                  <div>
                    <p className="rm-tip-heading">AI Support Insight</p>
                    <p className="rm-tip-body">Sharing your thoughts is the first step toward reducing cortisol levels. Our AI will analyze your patterns to suggest a personalized study-break routine.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Wellness sidebar */}
            <div className="rm-sidebar-col">
              <div className="rm-card rm-sidebar-card" role="complementary" aria-label="Wellness dashboard">
                <p className="rm-card-label">Wellness Dashboard</p>
                <StressTrendChart history={historyEntries} />

                <div className="rm-history-list" role="list" aria-label="Check-in history">
                  {historyEntries.length === 0 ? (
                    <div className="rm-empty-state">
                      <span className="rm-empty-icon" aria-hidden="true">📊</span>
                      <p>No check-ins yet. Make your first entry!</p>
                    </div>
                  ) : (
                    historyEntries.map((item) => (
                      <button
                        key={item.entry.id}
                        className={`rm-history-item ${activeJournalEntry?.id === item.entry.id ? 'rm-history-active' : ''}`}
                        onClick={() => selectHistoryItem(item)}
                        role="listitem"
                        aria-label={`Check-in from ${new Date(item.entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — Mood ${item.entry.moodScore}/10${item.insight ? `, ${item.insight.burnoutRisk.level} risk` : ''}`}
                      >
                        <div className="rm-history-top">
                          <span className="rm-history-date">{new Date(item.entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          <span className="rm-history-mood">Mood {item.entry.moodScore}/10</span>
                          {item.insight && (
                            <span className={`rm-risk-chip rm-risk-${item.insight.burnoutRisk.level.toLowerCase()}`}>
                              {item.insight.burnoutRisk.level}
                            </span>
                          )}
                        </div>
                        <p className="rm-history-preview">{item.entry.journalText.slice(0, 70)}...</p>
                        <div className="rm-history-meta">
                          <span>🌙 {item.entry.sleepHours}h sleep</span>
                          <span>📚 {item.entry.studyHours}h study</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INSIGHT VIEW ── */}
        {view === 'insight' && activeInsight && activeJournalEntry && (
          <div className="rm-insight-view">
            <div className="rm-view-header">
              <button className="rm-back-btn" onClick={() => setView('form')} aria-label="Go back to dashboard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Dashboard
              </button>
              <span className="rm-view-date">Analysis · {new Date(activeJournalEntry.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
            </div>

            <div className="rm-insights-grid" role="region" aria-label="Wellness analysis results">
              {/* Main flow */}
              <div className="rm-insights-main">
                {/* Emotional Analysis */}
                <div className="rm-card rm-insight-card" role="article" aria-label="Emotional analysis">
                  <div className="rm-card-top">
                    <span className="rm-card-label">😊 Emotional Analysis</span>
                  </div>
                  <div className="rm-emotion-row">
                    <div className="rm-emotion-pill rm-emotion-primary">
                      <span className="rm-emotion-type">Primary</span>
                      <span className="rm-emotion-val">{activeInsight.emotion.primary}</span>
                    </div>
                    <div className="rm-emotion-pill rm-emotion-secondary">
                      <span className="rm-emotion-type">Secondary</span>
                      <span className="rm-emotion-val">{activeInsight.emotion.secondary}</span>
                    </div>
                  </div>
                  <p className="rm-insight-text">{activeInsight.emotion.summary}</p>
                </div>

                {/* Stress Triggers */}
                <div className="rm-card rm-insight-card" role="article" aria-label="Detected stress triggers">
                  <div className="rm-card-top">
                    <span className="rm-card-label">⚠️ Hidden Stress Triggers</span>
                  </div>
                  <div className="rm-triggers">
                    {activeInsight.stressTrigger.length > 0 ? (
                      activeInsight.stressTrigger.map((t, i) => (
                        <span key={i} className="rm-trigger-chip">{t}</span>
                      ))
                    ) : (
                      <span className="rm-trigger-chip">No high-stress triggers detected</span>
                    )}
                  </div>
                </div>

                {/* Burnout Risk */}
                <div className="rm-card rm-insight-card" role="article" aria-label={`Burnout risk: ${activeInsight.burnoutRisk.level}`}>
                  <div className="rm-card-top">
                    <span className="rm-card-label">🧠 Burnout Risk Assessment</span>
                    <span className={`rm-risk-chip rm-risk-${activeInsight.burnoutRisk.level.toLowerCase()}`}>
                      {activeInsight.burnoutRisk.level} Risk
                    </span>
                  </div>
                  <p className="rm-insight-text">{activeInsight.burnoutRisk.reason}</p>
                </div>

                {/* Recovery Plan */}
                <div className="rm-card rm-insight-card" role="article" aria-label="Personalized recovery plan">
                  <div className="rm-card-top">
                    <span className="rm-card-label">✅ Personalized Recovery Plan</span>
                  </div>
                  <ol className="rm-recovery-list" aria-label="Recovery steps">
                    {activeInsight.recoveryPlan.map((step, i) => (
                      <li key={i} className="rm-recovery-item">
                        <span className="rm-recovery-num" aria-hidden="true">{i + 1}</span>
                        <span className="rm-recovery-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Detailed Stress Trigger Report */}
                {stressTriggerReport && (
                  <div className="rm-card rm-insight-card">
                    <div className="rm-card-top">
                      <span className="rm-card-label">🔍 Stress Trigger Report</span>
                    </div>
                    <pre className="rm-trigger-report" role="document" aria-label="Detailed stress trigger analysis">{stressTriggerReport}</pre>
                  </div>
                )}

                {/* Emotional Pattern Analysis */}
                {emotionalPattern && (
                  <div className="rm-card rm-insight-card">
                    <div className="rm-card-top">
                      <span className="rm-card-label">📈 Emotional Pattern Analysis</span>
                      <span className={`rm-risk-chip rm-risk-${emotionalPattern.trend === 'improving' ? 'low' : emotionalPattern.trend === 'declining' ? 'high' : 'medium'}`}>
                        {emotionalPattern.trend.charAt(0).toUpperCase() + emotionalPattern.trend.slice(1)}
                      </span>
                    </div>
                    <p className="rm-insight-text"><strong>Dominant Emotion:</strong> {emotionalPattern.dominantEmotion}</p>
                    <p className="rm-insight-text">{emotionalPattern.insight}</p>
                    {emotionalPattern.triggers.length > 0 && (
                      <div className="rm-triggers" style={{ marginTop: '8px' }}>
                        {emotionalPattern.triggers.map((t, i) => (
                          <span key={i} className="rm-trigger-chip">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="rm-insights-aside">
                {/* Future Self Letter */}
                <div className="rm-card rm-future-card" role="article" aria-label="Future self letter">
                  <div className="rm-card-top">
                    <span className="rm-card-label" style={{ color: '#7c3aed' }}>✨ Future Self Letter</span>
                  </div>
                  <blockquote className="rm-future-quote">"{activeInsight.futureMessage}"</blockquote>
                  <p className="rm-future-sig">— Your Future Self</p>
                </div>

                {/* Adaptive Mindfulness */}
                {mindfulnessExercises.length > 0 && (
                  <div className="rm-card rm-insight-card">
                    <div className="rm-card-top">
                      <span className="rm-card-label">🧘 Adaptive Mindfulness</span>
                    </div>
                    <p className="rm-insight-text" style={{ fontSize: '0.8rem', marginBottom: '8px', fontStyle: 'italic' }}>
                      Personalized for your current state:
                    </p>
                    <div className="rm-mindfulness-list">
                      {mindfulnessExercises.map((ex, i) => (
                        <div key={i} className="rm-mindfulness-item">
                          <div className="rm-mindfulness-header">
                            <span className="rm-mindfulness-name">{ex.name}</span>
                            <span className="rm-mindfulness-duration">{ex.duration}</span>
                          </div>
                          <p className="rm-mindfulness-desc">{ex.description}</p>
                          <span className={`rm-mindfulness-category rm-cat-${ex.category}`}>{ex.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Talk to Companion */}
                <div className="rm-card rm-chat-cta-card" role="complementary" aria-label="AI Companion chat">
                  <div className="rm-chat-cta-icon" aria-hidden="true">💬</div>
                  <h3 className="rm-chat-cta-title">Talk to Companion</h3>
                  <p className="rm-chat-cta-sub">Speak with our empathetic wellness AI to process today's challenges.</p>
                  <button className="rm-btn-primary rm-btn-full" onClick={startCompanionChat} aria-label="Open AI wellness companion chat">
                    Open Companion Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <div className="rm-chat-view" role="region" aria-label="AI Wellness Companion Chat">
            <div className="rm-view-header">
              <button className="rm-back-btn" onClick={() => setView(activeInsight ? 'insight' : 'form')} aria-label="Go back to previous screen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="rm-view-date">🧠 AI Wellness Companion</span>
            </div>

            <div className="rm-card rm-chat-card">
              <div className="rm-chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rm-chat-bubble ${msg.role === 'model' ? 'rm-bubble-ai' : 'rm-bubble-user'}`}
                    role="article"
                    aria-label={msg.role === 'model' ? 'AI Companion' : 'You'}
                  >
                    {msg.content}
                  </div>
                ))}
                {isChatTyping && (
                  <div className="rm-chat-bubble rm-bubble-ai rm-typing" aria-label="AI is typing">
                    <span></span><span></span><span></span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={sendChatMessage} className="rm-chat-form" aria-label="Send a message to the AI companion">
                <label htmlFor="chat-input" className="sr-only">Type your message</label>
                <input
                  id="chat-input"
                  type="text"
                  className="rm-chat-input"
                  placeholder="Share what's on your mind..."
                  value={userInputMessage}
                  onChange={(e) => setUserInputMessage(e.target.value)}
                  disabled={isChatTyping}
                  aria-label="Type your message to the AI companion"
                  autoComplete="off"
                />
                <button type="submit" className="rm-chat-send" disabled={isChatTyping || !userInputMessage.trim()} aria-label="Send message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="rm-footer" role="contentinfo">
        <div className="rm-footer-inner">
          <span className="rm-footer-brand">ResilientMind</span>
          <p className="rm-footer-copy">© 2024 ResilientMind. Your cognitive sanctuary.</p>
          <div className="rm-footer-links" role="navigation" aria-label="Footer navigation">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
            <a href="#" onClick={(e) => e.preventDefault()}>About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
