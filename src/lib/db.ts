// Client-side Database Layer using localStorage

export interface User {
  id: string;
  name: string;
  examType: string; // JEE, NEET, UPSC, CAT, GATE, Board, etc.
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  moodScore: number; // 1-10
  sleepHours: number;
  studyHours: number;
  journalText: string;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  journalId: string;
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
  createdAt: string;
}

const STORAGE_KEYS = {
  USERS: 'ewc_users',
  JOURNAL_ENTRIES: 'ewc_journal_entries',
  AI_INSIGHTS: 'ewc_api_insights',
  CURRENT_USER_ID: 'ewc_current_user_id',
  API_KEY: 'ewc_api_key',
};

// Helper functions for LocalStorage
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setToStorage = <T>(key: string, value: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const db = {
  // User operations
  createUser: (name: string, examType: string): User => {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      examType,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setToStorage(STORAGE_KEYS.USERS, users);
    setToStorage(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
    return newUser;
  },

  getCurrentUser: (): User | null => {
    const currentId = getFromStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    if (!currentId) return null;
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    return users.find((u) => u.id === currentId) || null;
  },

  setCurrentUser: (userId: string): void => {
    setToStorage(STORAGE_KEYS.CURRENT_USER_ID, userId);
  },

  listUsers: (): User[] => {
    return getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
  },

  logout: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  },

  // Journal entries operations
  createJournalEntry: (
    userId: string,
    moodScore: number,
    sleepHours: number,
    studyHours: number,
    journalText: string
  ): JournalEntry => {
    const entries = getFromStorage<JournalEntry[]>(STORAGE_KEYS.JOURNAL_ENTRIES, []);
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      userId,
      moodScore,
      sleepHours,
      studyHours,
      journalText,
      createdAt: new Date().toISOString(),
    };
    entries.push(newEntry);
    setToStorage(STORAGE_KEYS.JOURNAL_ENTRIES, entries);
    return newEntry;
  },

  getJournalEntries: (userId: string): JournalEntry[] => {
    const entries = getFromStorage<JournalEntry[]>(STORAGE_KEYS.JOURNAL_ENTRIES, []);
    return entries
      .filter((e) => e.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // AI insights operations
  saveAIInsight: (
    userId: string,
    journalId: string,
    insightData: Omit<AIInsight, 'id' | 'userId' | 'journalId' | 'createdAt'>
  ): AIInsight => {
    const insights = getFromStorage<AIInsight[]>(STORAGE_KEYS.AI_INSIGHTS, []);
    const newInsight: AIInsight = {
      ...insightData,
      id: crypto.randomUUID(),
      userId,
      journalId,
      createdAt: new Date().toISOString(),
    };
    insights.push(newInsight);
    setToStorage(STORAGE_KEYS.AI_INSIGHTS, insights);
    return newInsight;
  },

  getAIInsightForJournal: (journalId: string): AIInsight | null => {
    const insights = getFromStorage<AIInsight[]>(STORAGE_KEYS.AI_INSIGHTS, []);
    return insights.find((i) => i.journalId === journalId) || null;
  },

  getAIInsights: (userId: string): AIInsight[] => {
    const insights = getFromStorage<AIInsight[]>(STORAGE_KEYS.AI_INSIGHTS, []);
    return insights
      .filter((i) => i.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Clear database helper
  clearAll: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.JOURNAL_ENTRIES);
      localStorage.removeItem(STORAGE_KEYS.AI_INSIGHTS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
  },

  getApiKey: (): string => {
    return getFromStorage<string>(STORAGE_KEYS.API_KEY, '');
  },

  saveApiKey: (key: string): void => {
    setToStorage(STORAGE_KEYS.API_KEY, key);
  }
};
