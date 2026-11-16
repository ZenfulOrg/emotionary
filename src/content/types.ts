export type WordType = 'wanderword' | 'hidden_english' | 'psychology';

export type Level = 1 | 2 | 3 | 4 | 5;

/** The back of a word's card: where it comes from and what it carries. */
export interface WordStory {
  /** Cultural context and background. */
  background: string;
  /** The word's parts and what each one means. */
  roots: { part: string; meaning: string }[];
  /** A story, myth or tradition tied to the word. */
  myth?: string | null;
  /** One surprising detail. */
  fun_fact?: string | null;
}

/** A published word as delivered by Supabase (and mirrored in the bundled seed). */
export interface Word {
  id: string;
  slug: string;
  word: string;
  pronunciation: string;
  language: string;
  type: WordType;
  level: Level;
  definition: string;
  wisdom: string;
  is_free: boolean;
  /** Position on the free shelf (1 = first); null/absent sorts last. */
  free_order?: number | null;
  /** Recorded pronunciation; preferred over on-device speech when present. */
  audio_url?: string | null;
  /** Shown on the back of the card once `story_status` is 'live'. */
  story?: WordStory | null;
  story_status?: 'draft' | 'live';
  published_at: string; // ISO timestamp; drives the monthly rotation freeze
  updated_at: string;
}

/** Freshness stamp used by the probe-then-snapshot sync (DESIGN.md §6.3). */
export interface ContentStamp {
  maxUpdatedAt: string | null;
  count: number;
}

export interface ContentSnapshot {
  words: Word[];
  stamp: ContentStamp;
}
