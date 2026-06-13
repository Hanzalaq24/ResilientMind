import React, { useState, useEffect, useRef } from 'react';
import { db } from './lib/db';
import type { User as UserType, JournalEntry, AIInsight } from './lib/db';
import { analyzeJournal, getCompanionChatResponse } from './lib/gemini';
import type { ChatMessage, AIInsightOutput } from './lib/gemini';
import StressTrendChart from './components/StressTrendChart';

// Security: HTML/XSS input sanitizer
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

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
    if (!journalText.trim()) {
      alert('Please write a journal entry to analyze your wellbeing.');
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
      const aiResult: AIInsightOutput = await analyzeJournal(
        key,
        mood,
        sleep,
        study,
        journalText.trim(),
        currentUser.name,
        currentUser.examType,
        recentHistoryData
      );

      const insight = db.saveAIInsight(currentUser.id, entry.id, aiResult);
      setActiveJournalEntry(entry);
      setActiveInsight(insight);
      loadHistory(currentUser.id);

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

  const startCompanionChat = () => {
    if (!currentUser) return;
    let contextGreeting = "Hey! I'm your AI Wellness Companion. How are you feeling right now?";
    if (activeInsight) {
      const triggers = activeInsight.stressTrigger.join(' and ');
      contextGreeting = `Hi ${currentUser.name}! I noticed ${triggers || 'some stress patterns'} affecting you, with a ${activeInsight.burnoutRisk.level} burnout risk. Want to talk about it?`;
    }
    setChatMessages([{ role: 'model', content: contextGreeting }]);
    setView('chat');
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInputMessage.trim() || !currentUser) return;
    const userMsg = sanitizeInput(userInputMessage);
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(updatedMessages);
    setUserInputMessage('');
    setIsChatTyping(true);
    try {
      const key = db.getApiKey();
      const response = await getCompanionChatResponse(key, updatedMessages, currentUser.name, currentUser.examType, activeInsight);
      setChatMessages([...updatedMessages, { role: 'model' as const, content: response }]);
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
        <header className="rm-nav">
          <div className="rm-nav-inner">
            <div className="rm-brand">
              <div className="rm-brand-icon">R</div>
              <span>ResilientMind</span>
            </div>
          </div>
        </header>
        <main className="rm-onboarding">
          <div className="rm-onboarding-hero">
            <div className="rm-badge">AI-Powered · Exam Wellness</div>
            <h1 className="rm-hero-title">Your cognitive sanctuary<br />for exam success</h1>
            <p className="rm-hero-sub">
              Detect stress early, prevent burnout, and stay emotionally resilient during JEE, NEET, UPSC, CAT, GATE and board exam preparation.
            </p>
          </div>
          <div className="rm-card rm-onboard-card">
            <h2 className="rm-card-title">Begin your journey</h2>
            <form onSubmit={handleRegister} className="rm-form">
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
                />
              </div>
              <div className="rm-field">
                <label className="rm-label" htmlFor="exam-select">Target Exam</label>
                <select
                  id="exam-select"
                  className="rm-input rm-select"
                  value={examTypeInput}
                  onChange={(e) => setExamTypeInput(e.target.value)}
                >
                  <option value="JEE">JEE Main &amp; Advanced</option>
                  <option value="NEET">NEET UG</option>
                  <option value="UPSC">UPSC Civil Services</option>
                  <option value="CAT">CAT (MBA Entrance)</option>
                  <option value="GATE">GATE</option>
                  <option value="Board Exams">10th / 12th Board Exams</option>
                </select>
              </div>
              <button type="submit" className="rm-btn-primary">
                Get Started
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </form>
            <button className="rm-btn-ghost" onClick={fillDemoScenario} aria-label="Auto-fill demo scenario">
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
        <header className="rm-nav">
          <div className="rm-nav-inner">
            <div className="rm-brand">
              <div className="rm-brand-icon">R</div>
              <span>ResilientMind</span>
            </div>
          </div>
        </header>
        <main className="rm-loading-screen" role="status" aria-live="polite" aria-label="Loading AI analysis">
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
      {/* Nav */}
      <header className="rm-nav">
        <div className="rm-nav-inner">
          <div className="rm-brand">
            <div className="rm-brand-icon">R</div>
            <span>ResilientMind</span>
          </div>
          <nav className="rm-nav-links">
            <span className="rm-nav-user">
              {currentUser.name} · {currentUser.examType}
            </span>
            <button
              className="rm-nav-btn"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="rm-main">
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
                  <button className="rm-btn-ghost-sm" onClick={fillDemoScenario} aria-label="Auto-fill demo">⚡ Demo</button>
                </div>

                {/* Mood Slider */}
                <div className="rm-field-block">
                  <div className="rm-field-row">
                    <label className="rm-field-heading" htmlFor="mood-slider">How's your mood today?</label>
                    <span className={`rm-val-chip ${mood <= 3 ? 'rm-chip-low' : mood <= 7 ? 'rm-chip-mid' : 'rm-chip-high'}`}>{mood}/10</span>
                  </div>
                  <input
                    type="range" id="mood-slider" min="1" max="10"
                    className="rm-slider" value={mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    aria-label={`Mood level: ${mood} out of 10`}
                    aria-valuemin={1} aria-valuemax={10} aria-valuenow={mood}
                  />
                  <div className="rm-slider-labels">
                    <span>Exhausted</span><span>Calm</span><span>Energized</span>
                  </div>
                </div>

                {/* Sleep + Study grid */}
                <div className="rm-stats-grid">
                  <div className="rm-field-block">
                    <label className="rm-stat-label" htmlFor="sleep-input">
                      <span className="rm-stat-icon">🌙</span> Hours of Sleep
                    </label>
                    <input
                      type="number" id="sleep-input" className="rm-input rm-stat-input"
                      min="0" max="24" value={sleep}
                      onChange={(e) => setSleepHours(Number(e.target.value))}
                      aria-label={`Sleep hours: ${sleep}`}
                    />
                  </div>
                  <div className="rm-field-block">
                    <label className="rm-stat-label" htmlFor="study-input">
                      <span className="rm-stat-icon">📚</span> Study Hours
                    </label>
                    <input
                      type="number" id="study-input" className="rm-input rm-stat-input"
                      min="0" max="24" value={study}
                      onChange={(e) => setStudyHours(Number(e.target.value))}
                      aria-label={`Study hours: ${study}`}
                    />
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
                  />
                  <p className="rm-field-hint">Writing down frustrations helps clear cognitive space for better learning.</p>
                </div>

                {/* CTA */}
                <div className="rm-cta-wrapper">
                  <div className="rm-cta-glow" aria-hidden="true"></div>
                  <button className="rm-btn-primary rm-btn-full" onClick={handleAnalyze} aria-label="Analyze my wellbeing">
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
              <div className="rm-card rm-sidebar-card">
                <p className="rm-card-label">Wellness Dashboard</p>
                <StressTrendChart history={historyEntries} />

                <div className="rm-history-list">
                  {historyEntries.length === 0 ? (
                    <div className="rm-empty-state">
                      <span className="rm-empty-icon">📊</span>
                      <p>No check-ins yet. Make your first entry!</p>
                    </div>
                  ) : (
                    historyEntries.map((item) => (
                      <button
                        key={item.entry.id}
                        className={`rm-history-item ${activeJournalEntry?.id === item.entry.id ? 'rm-history-active' : ''}`}
                        onClick={() => selectHistoryItem(item)}
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

            <div className="rm-insights-grid">
              {/* Main flow */}
              <div className="rm-insights-main">
                {/* Emotional Analysis */}
                <div className="rm-card rm-insight-card">
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
                <div className="rm-card rm-insight-card">
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
                <div className="rm-card rm-insight-card">
                  <div className="rm-card-top">
                    <span className="rm-card-label">🧠 Burnout Risk Assessment</span>
                    <span className={`rm-risk-chip rm-risk-${activeInsight.burnoutRisk.level.toLowerCase()}`}>
                      {activeInsight.burnoutRisk.level} Risk
                    </span>
                  </div>
                  <p className="rm-insight-text">{activeInsight.burnoutRisk.reason}</p>
                </div>

                {/* Recovery Plan */}
                <div className="rm-card rm-insight-card">
                  <div className="rm-card-top">
                    <span className="rm-card-label">✅ Personalized Recovery Plan</span>
                  </div>
                  <ol className="rm-recovery-list">
                    {activeInsight.recoveryPlan.map((step, i) => (
                      <li key={i} className="rm-recovery-item">
                        <span className="rm-recovery-num">{i + 1}</span>
                        <span className="rm-recovery-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Sidebar */}
              <div className="rm-insights-aside">
                {/* Future Self Letter */}
                <div className="rm-card rm-future-card">
                  <div className="rm-card-top">
                    <span className="rm-card-label" style={{ color: '#7c3aed' }}>✨ Future Self Letter</span>
                  </div>
                  <blockquote className="rm-future-quote">"{activeInsight.futureMessage}"</blockquote>
                  <p className="rm-future-sig">— Your Future Self</p>
                </div>

                {/* Talk to Companion */}
                <div className="rm-card rm-chat-cta-card">
                  <div className="rm-chat-cta-icon" aria-hidden="true">💬</div>
                  <h3 className="rm-chat-cta-title">Talk to Companion</h3>
                  <p className="rm-chat-cta-sub">Speak with our empathetic wellness AI to process today's challenges.</p>
                  <button className="rm-btn-primary rm-btn-full" onClick={startCompanionChat} aria-label="Open companion chat">
                    Open Companion Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <div className="rm-chat-view">
            <div className="rm-view-header">
              <button className="rm-back-btn" onClick={() => setView(activeInsight ? 'insight' : 'form')} aria-label="Go back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="rm-view-date">🧠 AI Wellness Companion</span>
            </div>

            <div className="rm-card rm-chat-card">
              <div className="rm-chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`rm-chat-bubble ${msg.role === 'model' ? 'rm-bubble-ai' : 'rm-bubble-user'}`}>
                    {msg.content}
                  </div>
                ))}
                {isChatTyping && (
                  <div className="rm-chat-bubble rm-bubble-ai rm-typing">
                    <span></span><span></span><span></span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={sendChatMessage} className="rm-chat-form" aria-label="Chat message form">
                <input
                  type="text"
                  className="rm-chat-input"
                  placeholder="Share what's on your mind..."
                  value={userInputMessage}
                  onChange={(e) => setUserInputMessage(e.target.value)}
                  disabled={isChatTyping}
                  aria-label="Type your message to the AI companion"
                />
                <button type="submit" className="rm-chat-send" disabled={isChatTyping} aria-label="Send message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="rm-footer">
        <div className="rm-footer-inner">
          <span className="rm-footer-brand">ResilientMind</span>
          <p className="rm-footer-copy">© 2024 ResilientMind. Your cognitive sanctuary.</p>
          <div className="rm-footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
            <a href="#" onClick={(e) => e.preventDefault()}>About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
