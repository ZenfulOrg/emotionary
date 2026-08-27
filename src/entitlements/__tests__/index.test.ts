import type { Word } from '@/content/types';
import { canViewWord } from '@/entitlements';

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
  test('always allows the daily word', () => {
    expect(canViewWord(baseWord, baseWord.slug, false)).toBe(true);
  });

  test('allows the curated preview words', () => {
    expect(canViewWord({ ...baseWord, slug: 'acedia' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'alexithymia' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'ambivalence' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'anhedonia' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'apricity' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'catharsis' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'chrysalism' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'depaysement' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'duende' }, null, false)).toBe(true);
    expect(canViewWord({ ...baseWord, slug: 'dysphoria' }, null, false)).toBe(true);
  });

  test('exposes ten previews plus the current daily word exception', () => {
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
      'daily-word',
    ];
    const readable = slugs.filter((slug) =>
      canViewWord({ ...baseWord, slug }, 'daily-word', false),
    );
    expect(readable).toHaveLength(11);
    expect(canViewWord({ ...baseWord, slug: 'eleventh-preview' }, 'daily-word', false)).toBe(false);
  });

  test('locks other words until full access is active', () => {
    expect(canViewWord(baseWord, null, false)).toBe(false);
    expect(canViewWord(baseWord, null, true)).toBe(true);
  });
});
