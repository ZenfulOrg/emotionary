import type { Word } from '@/content/types';

/**
 * Daily-word engine — DESIGN.md §7.
 *
 * PROTOCOL WARNING: everything in this file is a cross-device, cross-version
 * protocol. Every client (and the notification scheduler) must compute
 * byte-identical permutations forever. Changing ANY algorithm here requires
 * bumping SEED_PREFIX to 'emotionary-v2:' (deliberately re-rolling everyone).
 * Golden fixtures in __tests__ pin exact outputs.
 */

// v2: deck rotation (every word once per cycle) replaced monthly reshuffles.
export const SEED_PREFIX = 'emotionary-v2:';

/** FNV-1a 32-bit hash of a string. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG over a 32-bit seed. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle driven by mulberry32(fnv1a(seed)). */
export function seededShuffle<T>(items: readonly T[], seedStr: string): T[] {
  const out = items.slice();
  const rand = mulberry32(fnv1a(seedStr));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Whole days since the Unix epoch for a local calendar date string.
 * Pure integer math on the date components — NEVER a live timestamp, so
 * timezones and DST cannot shift a "day" (DESIGN.md §7).
 */
export function daysSinceEpoch(localDate: string): number {
  const [y, m, d] = localDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** 'YYYY-MM-DD' in the device's local calendar. */
export function localDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthKey(localDate: string): string {
  return localDate.slice(0, 7);
}

/** Inverse of daysSinceEpoch. */
export function dateStringFromEpochDays(days: number): string {
  const d = new Date(days * 86_400_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add n calendar days to a 'YYYY-MM-DD' date string. */
export function addDays(localDate: string, n: number): string {
  return dateStringFromEpochDays(daysSinceEpoch(localDate) + n);
}

/**
 * Deck rotation (v2). The words are dealt like a shuffled deck: every word
 * published before a cycle begins appears exactly once in that cycle, then a
 * new cycle reshuffles everything published by then, so words added later join
 * the next cycle and no word repeats until every word has been seen.
 *
 * Cycle 0 starts on DECK_EPOCH. Cycle n+1 starts the day after cycle n's last
 * card. A cycle's deck is the words published before its start (sorted by id,
 * so input order never matters), shuffled with a per-cycle seed. Dates before
 * DECK_EPOCH wrap backwards through cycle 0.
 */
export const DECK_EPOCH = '2026-11-16';

function dayStartUtcMs(localDate: string): number {
  return daysSinceEpoch(localDate) * 86_400_000;
}

function byId(a: Word, b: Word): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Words dealt in the cycle that starts on `cycleStart`: published strictly
 * before that day. Fallback for bootstrap/misconfiguration: if none qualify,
 * every word does (never an empty rotation).
 */
export function deckPool(words: readonly Word[], cycleStart: string): Word[] {
  const start = dayStartUtcMs(cycleStart);
  const eligible = words.filter((w) => {
    const t = Date.parse(w.published_at);
    return Number.isFinite(t) && t < start;
  });
  return (eligible.length > 0 ? eligible : words.slice()).sort(byId);
}

type Cycle = { start: string; deck: Word[] };

/**
 * The cycle containing `localDate`, with the boundary repeat guard: if a
 * cycle would open on the word that closed the previous one, its first two
 * cards swap. Decks are memoized in `cache` (keyed by cycle start).
 */
export function cycleFor(
  words: readonly Word[],
  localDate: string,
  cache: Map<string, Word[]> = new Map(),
): Cycle | null {
  if (words.length === 0) return null;
  const deal = (start: string, previousLast: Word | null): Word[] => {
    const hit = cache.get(start);
    if (hit) return hit;
    const deck = seededShuffle(deckPool(words, start), SEED_PREFIX + start);
    if (previousLast && deck.length > 1 && deck[0].id === previousLast.id) {
      [deck[0], deck[1]] = [deck[1], deck[0]];
    }
    cache.set(start, deck);
    return deck;
  };

  let start = DECK_EPOCH;
  let deck = deal(start, null);
  if (localDate < start) return { start, deck };
  for (;;) {
    const next = addDays(start, deck.length);
    if (localDate < next) return { start, deck };
    const last = deck[deck.length - 1];
    start = next;
    deck = deal(start, last);
  }
}

/**
 * The word of the day for a local calendar date — deterministic on any device
 * (and the push server) from the same published word list. Returns null only
 * when there are no words at all.
 */
export function wordOfDay(
  words: readonly Word[],
  localDate: string,
  cache?: Map<string, Word[]>,
): Word | null {
  const cycle = cycleFor(words, localDate, cache);
  if (!cycle || cycle.deck.length === 0) return null;
  const offset = daysSinceEpoch(localDate) - daysSinceEpoch(cycle.start);
  const n = cycle.deck.length;
  return cycle.deck[((offset % n) + n) % n];
}
