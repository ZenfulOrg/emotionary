import type { Word } from '@/content/types';

export type PartOfSpeech = 'Adj.' | 'N.' | 'V.';

// The content API does not expose a part-of-speech field yet. These curated
// exceptions cover the non-nouns in the current catalog; new entries retain a
// safe noun fallback until the backend adds first-class grammatical metadata.
const ADJECTIVE_SLUGS = new Set(['halcyon', 'natsukashii']);
const VERB_SLUGS = new Set(['meraki']);

export function partOfSpeechFor(word: Pick<Word, 'slug'>): PartOfSpeech {
  if (ADJECTIVE_SLUGS.has(word.slug)) return 'Adj.';
  if (VERB_SLUGS.has(word.slug)) return 'V.';
  return 'N.';
}
