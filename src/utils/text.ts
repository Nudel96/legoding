import crypto from 'crypto';

/**
 * Normalize a listing title: lowercase, trim, collapse whitespace.
 */
export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Generate a SHA-256 hash of a string for dedup detection.
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a raw data hash from key listing fields for change detection.
 */
export function generateRawDataHash(fields: {
  externalId: string;
  title: string;
  price: number;
  shipping: number;
  condition: string;
}): string {
  const data = `${fields.externalId}|${fields.title}|${fields.price}|${fields.shipping}|${fields.condition}`;
  return hashString(data);
}

/**
 * Check if a keyword appears in text (case-insensitive).
 */
export function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * Count how many keywords from a list appear in the text.
 */
export function countKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

/**
 * Extract all matching keywords from a list that appear in the text.
 */
export function findKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}
