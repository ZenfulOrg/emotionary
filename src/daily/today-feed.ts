import { dailyFeed } from '@/daily/feed';
import { todaysWordFor } from '@/daily/welcome';
import { freeWords } from '@/entitlements';
import type { Word } from '@/content/types';

export type TodayFeedItem =
  | { kind: 'word'; key: string; word: Word }
  | { kind: 'upgrade'; key: 'upgrade' };

export function buildTodayFeed(
  words: Word[],
  today: string,
  hasFullAccess: boolean,
  cycleCount: number,
  welcomeDate: string | null = null,
  /** Words already read, snapshotted when Today opens: they go to the back. */
  seen: ReadonlySet<string> = new Set(),
): TodayFeedItem[] {
  const all = dailyFeed(words, today, todaysWordFor(words, today, welcomeDate), seen);
  if (all.length === 0) return [];

  if (!hasFullAccess) {
    // Today's word (always free) leads, then the free shelf in curated order.
    const todays = all[0];
    const shelf = freeWords(words).filter((word) => word.id !== todays.id);
    return [
      ...[todays, ...shelf].map((word) => ({ kind: 'word' as const, key: word.slug, word })),
      { kind: 'upgrade' as const, key: 'upgrade' as const },
    ];
  }

  return Array.from({ length: Math.max(1, cycleCount) }, (_, cycle) =>
    all.map((word) => ({
      kind: 'word' as const,
      key: `${cycle}:${word.slug}`,
      word,
    })),
  ).flat();
}
