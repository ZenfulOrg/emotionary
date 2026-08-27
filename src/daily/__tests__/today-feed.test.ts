import { buildTodayFeed } from '@/daily/today-feed';
import type { Word } from '@/content/types';

const slugs = [
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
  'locked-eleven',
  'locked-twelve',
];

const words: Word[] = slugs.map((slug, index) => ({
  id: String(index),
  slug,
  word: `Word ${index}`,
  pronunciation: `word ${index}`,
  language: 'English',
  type: 'hidden_english',
  level: 1,
  definition: `Definition ${index}`,
  wisdom: `Wisdom ${index}`,
  is_free: true,
  published_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}));

describe('buildTodayFeed', () => {
  test('stops the free feed at ten words and places upgrade at item eleven', () => {
    const feed = buildTodayFeed(words, '2026-08-27', false, 1);

    expect(feed).toHaveLength(11);
    expect(feed.slice(0, 10).every((item) => item.kind === 'word')).toBe(true);
    expect(feed[10]).toEqual({ kind: 'upgrade', key: 'upgrade' });
  });

  test('repeats the complete paid feed without duplicate list keys', () => {
    const feed = buildTodayFeed(words, '2026-08-27', true, 2);
    const keys = feed.map((item) => item.key);

    expect(feed).toHaveLength(words.length * 2);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('returns an empty feed when there is no content', () => {
    expect(buildTodayFeed([], '2026-08-27', false, 1)).toEqual([]);
  });
});
