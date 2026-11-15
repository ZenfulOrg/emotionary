import { buildTodayFeed } from '@/daily/today-feed';
import { dailyFeed } from '@/daily/feed';
import type { Word } from '@/content/types';

const FREE_WORD_ORDER = [
  'koi-no-yokan',
  'petrichor',
  'kilig',
  'iktsuarpok',
  'saudade',
  'apricity',
  'limerence',
  'cafune',
  'wabi-sabi',
  'hiraeth',
];

const premiumSlugs = ['premium-a', 'premium-b', 'premium-c', 'premium-d', 'premium-e'];

// Listed premium-first and reversed so the test proves free_order drives order.
const words: Word[] = [...premiumSlugs, ...[...FREE_WORD_ORDER].reverse()].map((slug, index) => ({
  id: String(index).padStart(2, '0'),
  slug,
  word: slug,
  pronunciation: `word ${index}`,
  language: 'English',
  type: 'hidden_english',
  level: 1,
  definition: `Definition ${index}`,
  wisdom: `Wisdom ${index}`,
  is_free: !premiumSlugs.includes(slug),
  free_order: premiumSlugs.includes(slug) ? null : FREE_WORD_ORDER.indexOf(slug) + 1,
  published_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}));

function wordSlugs(feed: ReturnType<typeof buildTodayFeed>): string[] {
  return feed.flatMap((item) => (item.kind === 'word' ? [item.word.slug] : []));
}

describe('buildTodayFeed', () => {
  test('free feed is today, then the free shelf in curated order, then upgrade', () => {
    // Check several days so both a free and a premium daily word are covered.
    for (const date of ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31']) {
      const feed = buildTodayFeed(words, date, false, 1);
      const today = dailyFeed(words, date)[0].slug;
      const slugs = wordSlugs(feed);

      expect(slugs[0]).toBe(today);
      expect(slugs.slice(1)).toEqual(FREE_WORD_ORDER.filter((slug) => slug !== today));
      expect(feed[feed.length - 1]).toEqual({ kind: 'upgrade', key: 'upgrade' });
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs.filter((slug) => premiumSlugs.includes(slug)).length).toBeLessThanOrEqual(1);
    }
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
