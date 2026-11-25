import type { Word } from '@/content/types';
import {
  isShareDemo,
  SHARE_DEMO_SLUG,
  canBrowseWord,
  canViewWord,
  compareFreeOrder,
  freeWords,
  slugsToKeep,
  wordAccess,
} from '@/entitlements';

const baseWord: Word = {
  id: 'word-id',
  slug: 'locked-word',
  word: 'Locked Word',
  pronunciation: 'locked-word',
  language: 'English',
  type: 'hidden_english',
  level: 2,
  definition: 'A definition.',
  wisdom: 'A thought.',
  is_free: false,
  published_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('free access policy', () => {
  test('a paid daily word is a teaser for free users, full for paid users', () => {
    expect(wordAccess(baseWord, baseWord.slug, false)).toBe('teaser');
    expect(canViewWord(baseWord, baseWord.slug, false)).toBe(true);
    expect(wordAccess(baseWord, baseWord.slug, true)).toBe('full');
  });

  test('a free daily word is fully readable', () => {
    expect(wordAccess({ ...baseWord, is_free: true }, baseWord.slug, false)).toBe('full');
  });

  test('other paid words are locked for free users', () => {
    expect(wordAccess(baseWord, 'something-else', false)).toBe('locked');
  });

  test('access follows is_free, not the slug', () => {
    expect(canBrowseWord({ ...baseWord, is_free: true }, false)).toBe(true);
    // A curated slug that the database marks premium stays locked.
    expect(canBrowseWord({ ...baseWord, slug: 'petrichor', is_free: false }, false)).toBe(false);
    // Former hardcoded previews are no longer free.
    expect(canBrowseWord({ ...baseWord, slug: 'acedia', is_free: false }, false)).toBe(false);
  });

  test('Browse does not add today as an extra free word', () => {
    expect(canBrowseWord({ ...baseWord, slug: 'daily-word' }, false)).toBe(false);
    expect(canBrowseWord({ ...baseWord, slug: 'daily-word' }, true)).toBe(true);
  });

  test('locks other words until full access is active', () => {
    expect(canViewWord(baseWord, null, false)).toBe(false);
    expect(canViewWord(baseWord, null, true)).toBe(true);
  });
});

describe('free word order', () => {
  test('orders free words by free_order, unordered ones alphabetically after', () => {
    const words: Word[] = [
      { ...baseWord, id: '1', slug: 'third', word: 'Third', is_free: true, free_order: 3 },
      { ...baseWord, id: '2', slug: 'zeta', word: 'Zeta', is_free: true, free_order: null },
      { ...baseWord, id: '3', slug: 'first', word: 'First', is_free: true, free_order: 1 },
      { ...baseWord, id: '4', slug: 'alpha', word: 'Alpha', is_free: true },
      { ...baseWord, id: '5', slug: 'second', word: 'Second', is_free: true, free_order: 2 },
      { ...baseWord, id: '6', slug: 'premium', word: 'Premium', is_free: false, free_order: 1 },
    ];
    expect(freeWords(words).map((w) => w.slug)).toEqual([
      'first',
      'second',
      'third',
      'alpha',
      'zeta',
    ]);
  });

  test('comparator ranks ordered words ahead of unordered ones', () => {
    const ordered = { ...baseWord, slug: 'koi-no-yokan', word: 'Koi no yokan', free_order: 1 };
    const unordered = { ...baseWord, slug: 'abc', word: 'Abc' };
    expect(compareFreeOrder(ordered, unordered)).toBeLessThan(0);
  });
});

describe('kept words', () => {
  const free = { ...baseWord, id: 'f', slug: 'petrichor', word: 'Petrichor', is_free: true };
  const paid = { ...baseWord, id: 'p', slug: 'acedia', word: 'Acedia', is_free: false };
  const other = { ...baseWord, id: 'o', slug: 'ennui', word: 'Ennui', is_free: false };
  const base = {
    words: [free, paid, other],
    readSlugs: [] as string[],
    favorites: [] as string[],
    kept: [] as string[],
    legacyDone: false,
    contentVerified: true,
  };

  test('a kept word stays unlocked for free users', () => {
    const kept = new Set(['acedia']);
    expect(canBrowseWord(paid, false, kept)).toBe(true);
    expect(canViewWord(paid, null, false, kept)).toBe(true);
    expect(canBrowseWord(other, false, kept)).toBe(false);
  });

  test('one-time grant covers legacy free words the user read or saved', () => {
    const result = slugsToKeep({ ...base, readSlugs: ['acedia', 'ennui'], favorites: ['dysphoria'] });
    expect(result.add.sort()).toEqual(['acedia', 'dysphoria']);
    expect(result.legacyDone).toBe(true);
  });

  test('legacy grant runs only once', () => {
    expect(slugsToKeep({ ...base, readSlugs: ['acedia'], legacyDone: true }).add).toEqual([]);
  });

  test('keeps read or saved words that are free now, never premium ones', () => {
    const result = slugsToKeep({ ...base, legacyDone: true, readSlugs: ['petrichor', 'ennui'] });
    expect(result.add).toEqual(['petrichor']);
  });

  test('does not trust unverified content (a stale bundled seed)', () => {
    const result = slugsToKeep({
      ...base,
      legacyDone: true,
      contentVerified: false,
      readSlugs: ['petrichor'],
    });
    expect(result.add).toEqual([]);
  });

  test('never re-adds what is already kept', () => {
    const result = slugsToKeep({ ...base, readSlugs: ['acedia'], kept: ['acedia'] });
    expect(result.add).toEqual([]);
  });
});

describe('isShareDemo', () => {
  test('only onboarding\'s demo word skips the share card lock', () => {
    expect(isShareDemo(SHARE_DEMO_SLUG, '1')).toBe(true);
    expect(isShareDemo('petrichor', '1')).toBe(false);
    expect(isShareDemo(SHARE_DEMO_SLUG, undefined)).toBe(false);
    expect(isShareDemo(undefined, '1')).toBe(false);
  });
});
