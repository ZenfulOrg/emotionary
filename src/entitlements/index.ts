import type { Word } from '@/content/types';

/**
 * Full access is supplied by verified StoreKit entitlements.
 *
 * Locked product rule: today's word is ALWAYS free (freemium must never
 * break the daily loop).
 */
export const FREE_WORD_LIMIT = 10;

// The first ten Browse entries in alphabetical order. Today's word remains an
// additional exception so the daily loop can never be blocked.
const FREE_PREVIEW_SLUGS = new Set([
  'acedia',
  'alexithymia',
  'ambivalence',
  'anhedonia',
  'apricity',
  'catharsis',
  'chrysalism',
  'depaysement',
  'duende',
  'dysphoria',
]);

/** Browse has one exact preview shelf: the first ten alphabetized entries. */
export function canBrowseWord(word: Word, hasFullAccess: boolean): boolean {
  return hasFullAccess || FREE_PREVIEW_SLUGS.has(word.slug);
}

export function canViewWord(
  word: Word,
  todaysSlug: string | null,
  hasFullAccess: boolean,
): boolean {
  return canBrowseWord(word, hasFullAccess) || word.slug === todaysSlug;
}
