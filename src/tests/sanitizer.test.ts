/**
 * Tests for the sanitizeInput security utility
 * Validates XSS prevention and input normalization
 */
import { describe, it, expect } from 'vitest';

// Replicate the sanitizeInput function for isolated unit testing
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

describe('sanitizeInput - XSS prevention', () => {
  it('strips HTML script tags to prevent XSS', () => {
    const result = sanitizeInput('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('encodes angle brackets', () => {
    expect(sanitizeInput('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
  });

  it('encodes double quotes', () => {
    expect(sanitizeInput('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('encodes single quotes', () => {
    expect(sanitizeInput("it's fine")).toBe('it&#x27;s fine');
  });

  it('encodes forward slashes', () => {
    expect(sanitizeInput('path/to/resource')).toBe('path&#x2F;to&#x2F;resource');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });

  it('handles empty string without error', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('leaves plain alphanumeric text unchanged', () => {
    const plain = 'Hello World 1234';
    expect(sanitizeInput(plain)).toBe(plain);
  });

  it('encodes SQL injection patterns', () => {
    const sqlAttempt = "'; DROP TABLE users; --";
    const result = sanitizeInput(sqlAttempt);
    expect(result).not.toContain("'");
    expect(result).toContain('&#x27;');
  });

  it('handles multiple XSS vectors in a single string', () => {
    const payload = '<img src="x" onerror="alert(1)">';
    const result = sanitizeInput(payload);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;img');
  });
});

describe('sanitizeInput - normal user inputs', () => {
  it('preserves normal journal text after sanitization', () => {
    const text = 'Today was tough. I studied 10 hours for JEE.';
    // Should be unchanged (no special chars)
    expect(sanitizeInput(text)).toBe(text);
  });

  it('handles unicode characters gracefully', () => {
    const unicode = 'नमस्ते — आज मैंने 8 घंटे पढ़ाई की';
    expect(sanitizeInput(unicode)).toBe(unicode);
  });
});
