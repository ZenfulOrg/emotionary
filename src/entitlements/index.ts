import type { Word } from '@/content/types';

/**
 * Monetization seam. The beta uses a local full-access flag so both the free
 * and unlocked experiences can be tested without charging anyone in TestFlight.
 * A store-backed entitlement can replace that flag in this module later.
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

export function canViewWord(
  word: Word,
  todaysSlug: string | null,
  hasFullAccess: boolean,
): boolean {
  return hasFullAccess || FREE_PREVIEW_SLUGS.has(word.slug) || word.slug === todaysSlug;
}
