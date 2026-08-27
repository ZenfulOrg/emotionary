import { partOfSpeechFor } from '@/content/part-of-speech';

describe('partOfSpeechFor', () => {
  test('labels curated adjectives and verbs', () => {
    expect(partOfSpeechFor({ slug: 'halcyon' })).toBe('Adj.');
    expect(partOfSpeechFor({ slug: 'natsukashii' })).toBe('Adj.');
    expect(partOfSpeechFor({ slug: 'meraki' })).toBe('V.');
  });

  test('defaults catalog concepts to nouns', () => {
    expect(partOfSpeechFor({ slug: 'acedia' })).toBe('N.');
  });
});
