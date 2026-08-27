import { dailyFeed } from '@/daily/feed';
import { canViewWord, FREE_WORD_LIMIT } from '@/entitlements';
import type { Word } from '@/content/types';

export type TodayFeedItem =
  | { kind: 'word'; key: string; word: Word }
  | { kind: 'upgrade'; key: 'upgrade' };

export function buildTodayFeed(
  words: Word[],
  today: string,
  hasFullAccess: boolean,
  cycleCount: number,
): TodayFeedItem[] {
  const all = dailyFeed(words, today);
  if (all.length === 0) return [];

  if (!hasFullAccess) {
    const todaysSlug = all[0]?.slug ?? null;
    const freeWords = all
      .filter((word) => canViewWord(word, todaysSlug, false))
      .slice(0, FREE_WORD_LIMIT);
    return [
      ...freeWords.map((word) => ({ kind: 'word' as const, key: word.slug, word })),
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
