import type { Word } from '@/content/types';
import { wordOfDay } from '@/daily/engine';
import { dailyFeed } from '@/daily/feed';

import seedJson from '../../../assets/seed/words.json';

const seedWords = (seedJson as { words: Word[] }).words;

describe('dailyFeed', () => {
  test('starts with the word of the day and includes every word exactly once', () => {
    const date = '2026-07-15';
    const feed = dailyFeed(seedWords, date);

    expect(feed[0]?.slug).toBe(wordOfDay(seedWords, date)?.slug);
    expect(feed).toHaveLength(seedWords.length);
    expect(new Set(feed.map((word) => word.id)).size).toBe(seedWords.length);
  });

  test('is stable for a day and changes order the next day', () => {
    const today = dailyFeed(seedWords, '2026-07-15').map((word) => word.slug);
    const repeated = dailyFeed(seedWords, '2026-07-15').map((word) => word.slug);
    const tomorrow = dailyFeed(seedWords, '2026-07-16').map((word) => word.slug);

    expect(repeated).toEqual(today);
    expect(tomorrow).not.toEqual(today);
  });

  test('puts new unread words first and read words last', () => {
    const date = '2026-07-15';
    const today = wordOfDay(seedWords, date)!;
    const others = seedWords
      .filter((word) => word.id !== today.id)
      .map((word) => ({ ...word, published_at: '2026-01-01T00:00:00Z' }));
    const fresh = { ...others[0], published_at: '2026-07-10T00:00:00Z' };
    const read = new Set([others[1].slug, others[2].slug]);
    const words = [fresh, ...others.slice(1), today];
    const feed = dailyFeed(words, date, today, read).map((word) => word.slug);

    expect(feed[0]).toBe(today.slug);
    expect(feed[1]).toBe(fresh.slug);
    expect(feed.slice(-2).sort()).toEqual([...read].sort());
    expect(feed).toHaveLength(words.length);
  });

  test('returns an empty feed for an empty corpus', () => {
    expect(dailyFeed([], '2026-07-15')).toEqual([]);
  });
});
