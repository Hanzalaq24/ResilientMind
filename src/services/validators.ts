// Input Validation & Security Service

const GEMINI_KEY_PREFIX = 'AIza';
const MAX_JOURNAL_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;

/**
 * Validate Gemini API key format.
 * Real keys start with 'AIza' followed by a base64 string.
 */
export function isValidGeminiApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (!key.startsWith(GEMINI_KEY_PREFIX)) return false;
  if (key.length < 30 || key.length > 100) return false;
  // Only allow alphanumeric, dash, and underscore after prefix
  const rest = key.slice(GEMINI_KEY_PREFIX.length);
  return /^[A-Za-z0-9_-]+$/.test(rest);
}

/**
 * Validate mood score (1-10).
 */
export function isValidMood(score: number): boolean {
  return Number.isInteger(score) && score >= 1 && score <= 10;
}

/**
 * Validate sleep hours (0-24).
 */
export function isValidSleep(hours: number): boolean {
  return typeof hours === 'number' && hours >= 0 && hours <= 24;
}

/**
 * Validate study hours (0-24).
 */
export function isValidStudyHours(hours: number): boolean {
  return typeof hours === 'number' && hours >= 0 && hours <= 24;
}

/**
 * Validate journal text length and content.
 */
export function isValidJournalText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 10) return false;
  if (trimmed.length > MAX_JOURNAL_LENGTH) return false;
  return true;
}

/**
 * Validate student name.
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_NAME_LENGTH) return false;
  // Allow letters, spaces, hyphens, and common international characters
  return /^[\p{L}\s'-]+$/u.test(trimmed);
}

/**
 * Validate exam type.
 */
export function isValidExamType(exam: string): boolean {
  const validTypes = ['JEE', 'NEET', 'UPSC', 'CAT', 'GATE', 'Board Exams'];
  return validTypes.includes(exam);
}

/**
 * Sanitize user input to prevent XSS.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate a complete check-in form.
 */
export function validateCheckIn(params: {
  mood: number;
  sleep: number;
  study: number;
  journalText: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isValidMood(params.mood)) errors.push('Mood must be between 1 and 10');
  if (!isValidSleep(params.sleep)) errors.push('Sleep hours must be between 0 and 24');
  if (!isValidStudyHours(params.study)) errors.push('Study hours must be between 0 and 24');
  if (!isValidJournalText(params.journalText)) {
    if (params.journalText.trim().length < 10) {
      errors.push('Journal entry must be at least 10 characters');
    } else if (params.journalText.length > MAX_JOURNAL_LENGTH) {
      errors.push(`Journal entry must be under ${MAX_JOURNAL_LENGTH} characters`);
    }
  }

  return { valid: errors.length === 0, errors };
}
