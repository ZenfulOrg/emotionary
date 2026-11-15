import Widget from '../../modules/emotionary-widgets/src/EmotionaryWidgetsModule';
import type { Word } from '@/content/types';
import { addDays, localDateString, wordOfDay } from '@/daily/engine';
import { canBrowseWord } from '@/entitlements';
import { LOCKED_WIDGET_LINE, type WidgetAccess } from '@/widgets/access';
import { asEntry, displayWord } from '@/content/presentation';
import { levelPalettes, planets } from '@/theme/tokens';

export function refreshDailyWordWidget(
  words: readonly Word[],
  _favorites: readonly string[] = [],
  access: WidgetAccess = { hasFullAccess: true, kept: [] },
): void {
  if (!Widget || !words.length) return;
  const kept = new Set(access.kept);
  const start = localDateString();
  const entries = Array.from({ length: 366 }, (_, offset) => {
    const date = addDays(start, offset);
    const word = wordOfDay(words, date);
    return word ? { date, word: displayWord(word.word), definition: canBrowseWord(word, access.hasFullAccess, kept) ? asEntry(word.definition) : LOCKED_WIDGET_LINE,
      category: `${planets[word.type].label} · ${word.language}`.toUpperCase(),
      tint: levelPalettes[word.level].tint, slug: word.slug } : null;
  }).filter(Boolean);
  Widget.updateTimeline?.(JSON.stringify(entries));
}
