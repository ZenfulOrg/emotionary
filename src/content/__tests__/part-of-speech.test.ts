import { partOfSpeechFor, pronunciationLineFor } from '@/content/part-of-speech';

describe('partOfSpeechFor', () => {
  test('labels curated adjectives and verbs', () => {
    expect(partOfSpeechFor({ slug: 'halcyon' })).toBe('Adj.');
    expect(partOfSpeechFor({ slug: 'natsukashii' })).toBe('Adj.');
    expect(partOfSpeechFor({ slug: 'meraki' })).toBe('V.');
  });

  test('defaults catalog concepts to nouns', () => {
    expect(partOfSpeechFor({ slug: 'acedia' })).toBe('N.');
  });

  test('formats the grammatical type beside the phonetic pronunciation', () => {
    expect(pronunciationLineFor({ slug: 'meraki', pronunciation: 'meh-rah-kee' })).toBe(
      'V. · /meh-rah-kee/',
    );
  });
});
