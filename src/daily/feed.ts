import type { Word } from '@/content/types';
import { daysSinceEpoch, seededShuffle, wordOfDay } from '@/daily/engine';

const FEED_SEED_PREFIX = 'emotionary-feed-v1:';

/** Words published this many days before today count as new and lead the feed. */
export const NEW_WORD_DAYS = 14;

/**
 * Today's scroll: the daily word first, then
 *   1. new words (published in the last two weeks) not read yet,
 *   2. every other word not read yet,
 *   3. words already read,
 * each group in its own random-looking order that reshuffles every day. With
 * new words arriving every month, someone always meets fresh words first
 * instead of scrolling past ones they've seen. The order only changes at
 * midnight (or when `seen` is re-snapshotted), so nothing jumps while reading.
 */
export function dailyFeed(
  words: readonly Word[],
  localDate: string,
  todaysWord: Word | null = wordOfDay(words, localDate),
  seen: ReadonlySet<string> = new Set(),
): Word[] {
  const today = todaysWord;
  if (!today) return [];

  const newSince = (daysSinceEpoch(localDate) - NEW_WORD_DAYS) * 86_400_000;
  const fresh: Word[] = [];
  const unread: Word[] = [];
  const read: Word[] = [];
  for (const word of words) {
    if (word.id === today.id) continue;
    if (seen.has(word.slug)) read.push(word);
    else if (Date.parse(word.published_at) >= newSince) fresh.push(word);
    else unread.push(word);
  }
  const seed = FEED_SEED_PREFIX + localDate;
  return [
    today,
    ...seededShuffle(fresh, `${seed}:new`),
    ...seededShuffle(unread, seed),
    ...seededShuffle(read, `${seed}:read`),
  ];
}
