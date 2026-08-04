import { STOP_WORDS } from './stopwords';

function isValidWord(word: string): boolean {
  // Skip stop words
  if (STOP_WORDS.has(word)) return false;

  // Skip too short or too long
  if (word.length < 3 || word.length > 25) return false;

  // Skip email domain patterns (com, edu, org, etc.)
  if (/\.(com|edu|org|net|gov|io)$/i.test(word)) return false;

  // Skip email artifacts
  if (['mailto', 'http', 'https', 'www'].includes(word)) return false;

  // Skip username-like patterns (1-3 letters followed by 3+ numbers, e.g., jsm003)
  if (/^[a-z]{1,3}\d{3,}$/i.test(word)) return false;

  // Skip if mostly numbers (like "2024" or "123abc")
  const digitCount = (word.match(/\d/g) || []).length;
  if (digitCount > word.length * 0.5) return false;

  // Skip encoded strings / hashes (have too many consonant clusters or random patterns)
  // Real words rarely have 4+ consonants in a row
  if (/[bcdfghjklmnpqrstvwxz]{4,}/i.test(word)) return false;

  // Skip words with numbers in the middle (like "abc123def" or base64-ish)
  if (/[a-z]+\d+[a-z]+/i.test(word)) return false;

  // Skip if it has too many hyphens (like UUIDs or encoded strings)
  if ((word.match(/-/g) || []).length > 2) return false;

  // Skip hex-like strings (32+ chars of only hex chars)
  if (word.length > 20 && /^[a-f0-9-]+$/.test(word)) return false;

  return true;
}

export function tokenize(text: string): string[] {
  // First, decode URL-encoded characters (e.g., %20 -> space, %26 -> &)
  // This prevents "20and" from "%20and" when % is stripped
  let decoded = text;
  try {
    decoded = decodeURIComponent(text.replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
  } catch {
    // If decoding fails, just use the original text
  }

  return decoded
    .toLowerCase()
    // Remove RTF hex codes like \22, \20 (backslash followed by hex)
    .replace(/\\[0-9a-f]{2}/gi, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(isValidWord);
}

export function countFrequency(texts: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const text of texts) {
    for (const word of tokenize(text)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  return freq;
}

export function analyzeTexts(
  sources: { subject: string; body: string }[],
  scope: 'subjects' | 'bodies' | 'both' = 'both'
): Map<string, number> {
  const texts: string[] = [];

  for (const source of sources) {
    if (scope === 'subjects' || scope === 'both') {
      if (source.subject) texts.push(source.subject);
    }
    if (scope === 'bodies' || scope === 'both') {
      if (source.body) texts.push(source.body);
    }
  }

  return countFrequency(texts);
}
