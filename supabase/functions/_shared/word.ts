/** The word fields the push server reads (a subset of the app's Word type). */
export interface Word {
  id: string;
  slug: string;
  word: string;
  definition: string;
  is_free: boolean;
  /** Emotional depth, 1 (light) to 5 (heaviest); picks the daily word. */
  level: number;
  published_at: string;
}
