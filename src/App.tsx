import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  User, 
  LogOut, 
  Smile, 
  Moon, 
  BookOpen, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare, 
  Send, 
  ArrowLeft,
  Calendar,
  Heart,
  Settings,
  X
} from 'lucide-react';
import { db } from './lib/db';
import type { User as UserType, JournalEntry, AIInsight } from './lib/db';
import { analyzeJournal, getCompanionChatResponse } from './lib/gemini';
import type { ChatMessage, AIInsightOutput } from './lib/gemini';

// Visual SVG Trend Chart Component
function StressTrendChart({ history }: { history: { entry: JournalEntry; insight: AIInsight | null }[] }) {
  const chartHeight = 120;
  const chartWidth = 500;
  const padding = 20;

  // Last 7 entries in chronological order
  const data = [...history]
    .slice(0, 7)
    .reverse();

  if (data.length < 2) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Log at least 2 check-ins to visualize stress & sleep trends.
      </div>
    );
  }

  const getX = (index: number) => {
    return padding + (index * (chartWidth - padding * 2)) / (data.length - 1);
  };

  const getMoodY = (score: number) => {
    return chartHeight - padding - ((score - 1) * (chartHeight - padding * 2)) / 9;
  };

  const getSleepY = (hours: number) => {
    const clamped = Math.max(2, Math.min(12, hours));
    return chartHeight - padding - ((clamped - 2) * (chartHeight - padding * 2)) / 10;
  };

  // Build paths
  let moodPath = '';
  let sleepPath = '';

  data.forEach((d, i) => {
    const x = getX(i);
    const yMood = getMoodY(d.entry.moodScore);
    const ySleep = getSleepY(d.entry.sleepHours);

    if (i === 0) {
      moodPath = `M ${x} ${yMood}`;
      sleepPath = `M ${x} ${ySleep}`;
    } else {
      moodPath += ` L ${x} ${yMood}`;
      sleepPath += ` L ${x} ${ySleep}`;
    }
  });

  return (
    <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
          Mood Level (1-10)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }}></span>
          Sleep Hours (2-12h)
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="3" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="3" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255, 255, 255, 0.06)" />

          {/* Paths */}
          <path d={moodPath} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 4px rgba(0, 242, 254, 0.4))' }} />
          <path d={sleepPath} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 4px rgba(168, 85, 247, 0.4))' }} />

          {/* Data Points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getMoodY(d.entry.moodScore)} r="4" fill="var(--accent-cyan)" />
              <circle cx={getX(i)} cy={getSleepY(d.entry.sleepHours)} r="4" fill="#a855f7" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [examTypeInput, setExamTypeInput] = useState('JEE');
  const [apiKeyInput, setApiKeyInput] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
  
  // Daily check-in form state
  const [mood, setMood] = useState(5);
  const [sleep, setSleepHours] = useState(7);
  const [study, setStudyHours] = useState(8);
  const [journalText, setJournalText] = useState('');
  
  // Navigation & Flow states
  const [view, setView] = useState<'form' | 'loading' | 'insight' | 'chat'>('form');
  const [loadingText, setLoadingText] = useState('Companion is processing your log...');
  const [activeInsight, setActiveInsight] = useState<AIInsight | null>(null);
  const [activeJournalEntry, setActiveJournalEntry] = useState<JournalEntry | null>(null);
  const [historyEntries, setHistoryEntries] = useState<{ entry: JournalEntry; insight: AIInsight | null }[]>([]);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInputMessage, setUserInputMessage] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsKeyInput, setSettingsKeyInput] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load current user, key, and history on mount
  useEffect(() => {
    const user = db.getCurrentUser();
    const savedKey = db.getApiKey();
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (savedKey) {
      setApiKeyInput(savedKey);
      setSettingsKeyInput(savedKey);
    } else if (envKey) {
      setApiKeyInput(envKey);
      setSettingsKeyInput(envKey);
      db.saveApiKey(envKey);
    }
    if (user) {
      setCurrentUser(user);
      loadHistory(user.id);
    }
  }, []);

  // Scroll chat to bottom when message arrives
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
    if (!apiKeyInput.trim()) {
      alert('Please enter a Gemini API Key to enable AI features.');
      return;
    }
    db.saveApiKey(apiKeyInput.trim());
    const user = db.createUser(nameInput.trim(), examTypeInput);
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
    if (!key) {
      alert("Please configure a Gemini API Key in Settings first.");
      setShowSettings(true);
      return;
    }
    if (!journalText.trim()) {
      alert("Please write a journal entry to analyze your stress levels.");
      return;
    }

    setView('loading');
    setLoadingText("Gemini is analyzing emotional markers...");
    
    try {
      // 1. Create database record for entry
      const entry = db.createJournalEntry(
        currentUser.id,
        mood,
        sleep,
        study,
        journalText.trim()
      );
      
      // 2. Fetch past entries to provide trend analysis
      const recentHistoryData = historyEntries.slice(0, 5).map(h => ({
        moodScore: h.entry.moodScore,
        sleepHours: h.entry.sleepHours,
        studyHours: h.entry.studyHours,
        journalText: h.entry.journalText
      }));

      // 3. Call AI Analysis API passing key
      setLoadingText("Detecting hidden stress triggers and predicting burnout risk...");
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

      // 4. Save AI Insights in mock DB
      const insight = db.saveAIInsight(currentUser.id, entry.id, aiResult);
      
      // Update local states
      setActiveJournalEntry(entry);
      setActiveInsight(insight);
      loadHistory(currentUser.id);
      
      // Reset form
      setJournalText('');
      setMood(5);
      setSleepHours(7);
      setStudyHours(8);
      
      setView('insight');
    } catch (err) {
      console.error(err);
      setView('form');
      alert("Failed to analyze stress patterns. Please check your API key in Settings and try again.");
    }
  };

  // Pre-fill fields for a quick Hackathon demo scenario
  const fillDemoScenario = () => {
    setMood(3);
    setSleepHours(4);
    setStudyHours(11);
    setJournalText("My mock test went terribly. I don't think I can crack JEE.");
    
    // Auto-fill a demo API key if they don't have one configured
    const existingKey = db.getApiKey();
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!existingKey && envKey) {
      setApiKeyInput(envKey);
      setSettingsKeyInput(envKey);
      db.saveApiKey(envKey);
    }
  };

  const selectHistoryItem = (item: { entry: JournalEntry; insight: AIInsight | null }) => {
    setActiveJournalEntry(item.entry);
    setActiveInsight(item.insight);
    if (item.insight) {
      setView('insight');
    }
  };

  const startCompanionChat = () => {
    if (!currentUser) return;
    
    // Construct dynamic starter question context-aware
    let contextGreeting = "Hey there! I'm your Wellness Companion. How are you feeling right now?";
    if (activeInsight) {
      const triggers = activeInsight.stressTrigger.join(' and ');
      contextGreeting = `Hi ${currentUser.name}, I noticed that ${triggers || 'recent studies'} have been causing you stress, and your burnout risk is ${activeInsight.burnoutRisk.level}. Want to talk about what's going on or today's routine?`;
    }
    
    setChatMessages([
      { role: 'model', content: contextGreeting }
    ]);
    setView('chat');
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInputMessage.trim() || !currentUser) return;

    const userMsg = userInputMessage.trim();
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    
    setChatMessages(updatedMessages);
    setUserInputMessage('');
    setIsChatTyping(true);

    try {
      const key = db.getApiKey();
      const response = await getCompanionChatResponse(
        key,
        updatedMessages,
        currentUser.name,
        currentUser.examType,
        activeInsight
      );
      setChatMessages([...updatedMessages, { role: 'model' as const, content: response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatTyping(false);
    }
  };

  const saveSettings = () => {
    db.saveApiKey(settingsKeyInput.trim());
    setApiKeyInput(settingsKeyInput.trim());
    setShowSettings(false);
  };

  // Welcome onboarding screen
  if (!currentUser) {
    return (
      <div className="app-container">
        <header>
          <div className="logo">
            <Brain size={28} />
            <span>ResilientMind</span>
            <span className="logo-sub">Exam Wellness</span>
          </div>
        </header>
        <main>
          <div className="welcome-container">
            <div className="badge-glow">AI-Powered Exam Wellness Companion</div>
            <h1 className="welcome-title">Your AI Wellness Companion for Exam Success</h1>
            <p className="welcome-subtitle">
              Detect stress early, prevent burnout, and stay emotionally resilient during JEE, NEET, UPSC, CAT, GATE, and board exam preparation.
            </p>
            <div className="glass-panel setup-card">
              <h3 style={{ fontFamily: 'var(--font-title)', marginBottom: '1.5rem', fontSize: '1.25rem' }}>Start Your Journey</h3>
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label" htmlFor="student-name">Your Name</label>
                  <input 
                    type="text" 
                    id="student-name"
                    className="form-input" 
                    placeholder="Enter your name" 
                    value={nameInput} 
                    onChange={(e) => setNameInput(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="exam-select">Target Exam</label>
                  <select 
                    id="exam-select"
                    className="form-select"
                    value={examTypeInput}
                    onChange={(e) => setExamTypeInput(e.target.value)}
                  >
                    <option value="JEE">JEE Main & Advanced</option>
                    <option value="NEET">NEET UG</option>
                    <option value="UPSC">UPSC Civil Services</option>
                    <option value="CAT">CAT (MBA Entrance)</option>
                    <option value="GATE">GATE</option>
                    <option value="Board Exams">10th / 12th Board Exams</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label className="form-label" htmlFor="api-key-setup">Gemini API Key</label>
                  <input 
                    type="password" 
                    id="api-key-setup"
                    className="form-input" 
                    placeholder="Enter Gemini API key" 
                    value={apiKeyInput} 
                    onChange={(e) => setApiKeyInput(e.target.value)} 
                    required 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Stored strictly locally in your browser's LocalStorage. Never uploaded to a server.
                  </span>
                </div>
                <button type="submit" className="action-btn">
                  <Sparkles size={18} /> Get Started
                </button>
              </form>
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button 
                  className="logout-btn" 
                  onClick={fillDemoScenario}
                  style={{ width: '100%', borderColor: 'rgba(0, 242, 254, 0.2)', color: 'var(--accent-cyan)' }}
                >
                  ⚡ Auto-Fill Demo Profile & Key
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Loading Screen
  if (view === 'loading') {
    return (
      <div className="app-container">
        <header>
          <div className="logo">
            <Brain size={28} />
            <span>ResilientMind</span>
          </div>
        </header>
        <main>
          <div className="loading-view">
            <div className="spinner"></div>
            <p className="loading-text">{loadingText}</p>
            <p style={{ color: 'var(--text-muted)' }}>Using Gemini AI model to identify stress biomarkers...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Brain size={28} />
          <span>ResilientMind</span>
        </div>
        <div className="user-nav-badge">
          <div className="nav-username">
            <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: 'var(--accent-cyan)' }} />
            <span>{currentUser.name} ({currentUser.examType})</span>
          </div>
          <button className="logout-btn" onClick={() => setShowSettings(true)} style={{ marginRight: '0.5rem' }}>
            <Settings size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Settings
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Sign Out
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setShowSettings(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontFamily: 'var(--font-title)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} style={{ color: 'var(--accent-cyan)' }} /> Settings
            </h3>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="api-key-settings">Gemini API Key</label>
              <input 
                type="password" 
                id="api-key-settings"
                className="form-input" 
                placeholder="Enter Gemini API key" 
                value={settingsKeyInput} 
                onChange={(e) => setSettingsKeyInput(e.target.value)} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Stored locally in your browser.
              </span>
            </div>
            <button className="action-btn" onClick={saveSettings}>Save Changes</button>
          </div>
        </div>
      )}

      <main>
        {view === 'form' && (
          <div className="dashboard-grid">
            {/* Main check-in panel */}
            <div className="glass-panel checkin-card">
              <div className="card-header-row">
                <div className="card-title-badge">
                  <Heart size={20} />
                  <span>Daily Wellness Log</span>
                </div>
                <button className="btn-secondary" onClick={fillDemoScenario}>
                  ⚡ Auto-Fill Demo Scenario
                </button>
              </div>

              <div className="sliders-row">
                <div className="slider-container">
                  <div className="slider-header">
                    <label className="form-label" htmlFor="mood-slider" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Smile size={16} /> Mood Level
                    </label>
                    <span className="slider-val">{mood}/10</span>
                  </div>
                  <input 
                    type="range" 
                    id="mood-slider"
                    min="1" 
                    max="10" 
                    className="input-slider" 
                    value={mood} 
                    onChange={(e) => setMood(Number(e.target.value))} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    <span>Stressed</span>
                    <span>Amazing</span>
                  </div>
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <label className="form-label" htmlFor="sleep-slider" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Moon size={16} /> Sleep Duration
                    </label>
                    <span className="slider-val">{sleep} hrs</span>
                  </div>
                  <input 
                    type="range" 
                    id="sleep-slider"
                    min="2" 
                    max="14" 
                    className="input-slider" 
                    value={sleep} 
                    onChange={(e) => setSleepHours(Number(e.target.value))} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    <span>Poor</span>
                    <span>Restful</span>
                  </div>
                </div>
              </div>

              <div className="sliders-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.5rem' }}>
                <div className="slider-container">
                  <div className="slider-header">
                    <label className="form-label" htmlFor="study-slider" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={16} /> Study Hours (Today)
                    </label>
                    <span className="slider-val">{study} hrs</span>
                  </div>
                  <input 
                    type="range" 
                    id="study-slider"
                    min="0" 
                    max="18" 
                    className="input-slider" 
                    value={study} 
                    onChange={(e) => setStudyHours(Number(e.target.value))} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    <span>0h</span>
                    <span>18h+</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="journal-input" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Brain size={16} /> Journal Log / Emotional Dump
                </label>
                <textarea 
                  id="journal-input"
                  rows={4} 
                  className="form-textarea" 
                  placeholder="How did study go? Are you feeling pressure? Describe mock scores or mindset..." 
                  value={journalText} 
                  onChange={(e) => setJournalText(e.target.value)}
                />
              </div>

              <button className="action-btn" onClick={handleAnalyze} style={{ marginTop: '0.5rem' }}>
                <Sparkles size={18} /> Analyze Stress & Predict Burnout
              </button>
            </div>

            {/* Sidebar history & SVG Chart */}
            <div className="glass-panel history-sidebar">
              <div className="sidebar-title">
                <Calendar size={18} />
                <span>Wellness Dashboard</span>
              </div>
              
              {/* Render Trend Chart */}
              <StressTrendChart history={historyEntries} />

              <div className="history-list" style={{ marginTop: '1.5rem' }}>
                {historyEntries.length === 0 ? (
                  <div className="empty-history">
                    <Smile size={24} />
                    <p>No logged check-ins yet. Make your first entry!</p>
                  </div>
                ) : (
                  historyEntries.map((item) => (
                    <div 
                      key={item.entry.id} 
                      className={`history-item ${activeJournalEntry?.id === item.entry.id ? 'active' : ''}`}
                      onClick={() => selectHistoryItem(item)}
                    >
                      <div className="history-item-header">
                        <span>{new Date(item.entry.createdAt).toLocaleDateString()}</span>
                        <span>Mood: {item.entry.moodScore}/10</span>
                      </div>
                      <div className="history-item-body">
                        {item.entry.journalText}
                      </div>
                      <div className="history-item-metrics">
                        <div className="metric-badge">
                          <Moon size={10} style={{ marginRight: '2px' }} /> {item.entry.sleepHours}h sleep
                        </div>
                        <div className="metric-badge">
                          <BookOpen size={10} style={{ marginRight: '2px' }} /> {item.entry.studyHours}h study
                        </div>
                        {item.insight && (
                          <span style={{ 
                            marginLeft: 'auto', 
                            fontSize: '0.7rem', 
                            fontWeight: '600',
                            color: item.insight.burnoutRisk.level === 'High' ? 'var(--color-high)' : item.insight.burnoutRisk.level === 'Medium' ? 'var(--color-medium)' : 'var(--color-low)'
                          }}>
                            Risk: {item.insight.burnoutRisk.level}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'insight' && activeInsight && activeJournalEntry && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setView('form')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Dashboard
              </button>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--text-muted)' }}>
                Analysis for {new Date(activeJournalEntry.createdAt).toLocaleDateString()}
              </h3>
            </div>

            <div className="insights-container">
              {/* Main Insights list */}
              <div className="insights-main-flow">
                {/* 1. Emotional Analysis */}
                <div className="glass-panel insight-card">
                  <div className="card-header-row">
                    <div className="card-title-badge">
                      <Smile size={18} />
                      <span>Emotional Analysis</span>
                    </div>
                  </div>
                  <div className="emotions-grid">
                    <div className="emotion-pill">
                      <div className="emotion-type">Primary Emotion</div>
                      <div className="emotion-val" style={{ color: 'var(--accent-cyan)' }}>{activeInsight.emotion.primary}</div>
                    </div>
                    <div className="emotion-pill">
                      <div className="emotion-type">Secondary Emotion</div>
                      <div className="emotion-val" style={{ color: 'var(--accent-purple)' }}>{activeInsight.emotion.secondary}</div>
                    </div>
                  </div>
                  <p className="emotion-summary-text">{activeInsight.emotion.summary}</p>
                </div>

                {/* 2. Hidden Stress Trigger Detection */}
                <div className="glass-panel insight-card">
                  <div className="card-header-row">
                    <div className="card-title-badge">
                      <AlertTriangle size={18} />
                      <span>Hidden Stress Triggers</span>
                    </div>
                  </div>
                  <div className="triggers-list">
                    {activeInsight.stressTrigger.map((trigger, i) => (
                      <span key={i} className="trigger-badge">
                        <AlertTriangle size={14} />
                        {trigger}
                      </span>
                    ))}
                    {activeInsight.stressTrigger.length === 0 && (
                      <span className="trigger-badge">No high-stress triggers detected.</span>
                    )}
                  </div>
                </div>

                {/* 3. Burnout Risk Prediction */}
                <div className="glass-panel insight-card">
                  <div className="card-header-row">
                    <div className="card-title-badge">
                      <Brain size={18} />
                      <span>Burnout Risk Assessment</span>
                    </div>
                    <div className={`status-indicator ${activeInsight.burnoutRisk.level.toLowerCase()}`}>
                      Burnout Risk: {activeInsight.burnoutRisk.level}
                    </div>
                  </div>
                  <p className="emotion-summary-text" style={{ fontWeight: '500' }}>
                    {activeInsight.burnoutRisk.reason}
                  </p>
                </div>

                {/* 4. Personalized Recovery Plan */}
                <div className="glass-panel insight-card">
                  <div className="card-header-row">
                    <div className="card-title-badge">
                      <CheckCircle size={18} />
                      <span>Today's Personalized Recovery Plan</span>
                    </div>
                  </div>
                  <div className="recovery-list">
                    {activeInsight.recoveryPlan.map((step, i) => (
                      <div key={i} className="recovery-item-box">
                        <div className="recovery-index">{i + 1}</div>
                        <div className="recovery-text">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar with Future self message & chat action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Future Self Message */}
                <div className="glass-panel insight-card future-card">
                  <div className="card-header-row">
                    <div className="card-title-badge" style={{ color: '#c084fc' }}>
                      <Sparkles size={18} />
                      <span>Future Self Letter</span>
                    </div>
                  </div>
                  <div className="future-letter-content">
                    "{activeInsight.futureMessage}"
                  </div>
                  <div className="future-signature">
                    — Your Future Self
                  </div>
                </div>

                {/* Call to Chat Companion */}
                <div className="glass-panel insight-card" style={{ textAlign: 'center', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                  <MessageSquare size={36} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Talk to Companion</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Speak with our empathetic wellness chatbot to talk through today's hurdles.
                  </p>
                  <button className="action-btn" onClick={startCompanionChat}>
                    <MessageSquare size={16} /> Open Companion Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setView(activeInsight ? 'insight' : 'form')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back
              </button>
              <h3 style={{ fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={20} style={{ color: 'var(--accent-cyan)' }} /> AI Wellness Companion Chat
              </h3>
            </div>

            <div className="glass-panel chat-container">
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role === 'model' ? 'assistant' : 'user'}`}>
                    {msg.content}
                  </div>
                ))}
                {isChatTyping && (
                  <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Companion is thinking...
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
              <form onSubmit={sendChatMessage} className="chat-input-row">
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Share what's on your mind..." 
                  value={userInputMessage}
                  onChange={(e) => setUserInputMessage(e.target.value)}
                  disabled={isChatTyping}
                />
                <button type="submit" className="chat-send-btn" disabled={isChatTyping}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
