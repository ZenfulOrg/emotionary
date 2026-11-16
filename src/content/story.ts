import type { Word, WordStory } from '@/content/types';

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/**
 * The word's story when it is live and well formed, else null. Drafts, empty
 * stories and malformed rows never reach the card.
 */
export function liveStory(word: Pick<Word, 'story' | 'story_status'>): WordStory | null {
  if (word.story_status !== 'live' || !word.story || typeof word.story !== 'object') return null;
  const background = text(word.story.background);
  if (!background) return null;
  const roots = Array.isArray(word.story.roots)
    ? word.story.roots.flatMap((root) => {
        const part = text(root?.part);
        const meaning = text(root?.meaning);
        return part && meaning ? [{ part, meaning }] : [];
      })
    : [];
  return { background, roots, myth: text(word.story.myth), fun_fact: text(word.story.fun_fact) };
}
