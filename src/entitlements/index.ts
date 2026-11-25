import type { Word } from '@/content/types';

/**
 * Full access is supplied by store entitlements or a server-managed account grant.
 *
 * Free access is driven by `words.is_free` in Supabase, which the admin panel
 * edits; free_order sets their order. Today's word is always shown to free
 * users so the daily loop never breaks, but when it is a paid word only the
 * word itself is free and its meaning is the upgrade ('teaser').
 */

/**
 * The free words through 1.7.0 (when the list was built into the app). Free
 * users who read or saved one of these keep it after updating.
 */
export const LEGACY_FREE_SLUGS: ReadonlySet<string> = new Set([
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

const NONE: ReadonlySet<string> = new Set();

/**
 * Browse lock: words flagged free in Supabase, plus words this user kept
 * (read or saved while free), unless full access is active.
 */
export function canBrowseWord(
  word: Word,
  hasFullAccess: boolean,
  kept: ReadonlySet<string> = NONE,
): boolean {
  return hasFullAccess || word.is_free === true || kept.has(word.slug);
}

/**
 * How much of a word a user may see:
 * - 'full'   free word, kept word, or full access
 * - 'teaser' today's word on the free plan: the word itself and its
 *            pronunciation are shown, its meaning is the upgrade
 * - 'locked' everything else
 */
export type WordAccess = 'full' | 'teaser' | 'locked';

export function wordAccess(
  word: Word,
  todaysSlug: string | null,
  hasFullAccess: boolean,
  kept: ReadonlySet<string> = NONE,
): WordAccess {
  if (canBrowseWord(word, hasFullAccess, kept)) return 'full';
  return word.slug === todaysSlug ? 'teaser' : 'locked';
}

/** Whether the word's page can be opened at all (fully or as today's teaser). */
export function canViewWord(
  word: Word,
  todaysSlug: string | null,
  hasFullAccess: boolean,
  kept: ReadonlySet<string> = NONE,
): boolean {
  return wordAccess(word, todaysSlug, hasFullAccess, kept) !== 'locked';
}

/**
 * Which slugs to add to a user's kept set. Never removes anything.
 * - Once: legacy free words the user had already read or saved.
 * - Always: any read or saved word that is free right now, so it stays
 *   unlocked if the admin later makes it premium. Only applied to content
 *   verified against the server, so a stale bundled seed can't over-grant.
 *   Words seen only as "today's word" are not kept, as they were not free.
 */
export function slugsToKeep(input: {
  words: readonly Word[];
  readSlugs: readonly string[];
  favorites: readonly string[];
  kept: readonly string[];
  legacyDone: boolean;
  contentVerified: boolean;
}): { add: string[]; legacyDone: boolean } {
  const touched = new Set([...input.readSlugs, ...input.favorites]);
  const kept = new Set(input.kept);
  const add = new Set<string>();

  if (!input.legacyDone) {
    for (const slug of touched) if (LEGACY_FREE_SLUGS.has(slug)) add.add(slug);
  }
  if (input.contentVerified) {
    for (const word of input.words) {
      if (word.is_free === true && touched.has(word.slug)) add.add(word.slug);
    }
  }
  return {
    add: [...add].filter((slug) => !kept.has(slug)),
    legacyDone: true,
  };
}

/**
 * Comparator for the free shelf: `free_order` from Supabase (1 = first), with
 * words that have no order placed after, alphabetically. Editing is_free or
 * free_order in the admin panel changes this without an app release.
 */
export function compareFreeOrder(a: Word, b: Word): number {
  const ra = a.free_order ?? Number.MAX_SAFE_INTEGER;
  const rb = b.free_order ?? Number.MAX_SAFE_INTEGER;
  return ra !== rb ? ra - rb : a.word.localeCompare(b.word);
}

/** The free words, in free_order. */
export function freeWords(words: readonly Word[]): Word[] {
  return words.filter((w) => w.is_free === true).sort(compareFreeOrder);
}

/** The word onboarding uses to show the share card before the user has any access. */
export const SHARE_DEMO_SLUG = 'meraki';

/**
 * Whether a share card link may skip the access check. Only onboarding's
 * demo of its own word does: any other slug with ?demo=1 (for example from a
 * typed deep link) would otherwise show a locked word's meaning for free.
 */
export function isShareDemo(slug: string | undefined, demo: string | undefined): boolean {
  return demo === '1' && slug === SHARE_DEMO_SLUG;
}
