/** The word fields the push server reads (a subset of the app's Word type). */
export interface Word {
  id: string;
  slug: string;
  word: string;
  definition: string;
  is_free: boolean;
  published_at: string;
}
