import { Platform } from 'react-native';

import type { Word } from '@/content/types';
import { addDays, localDateString, wordOfDay } from '@/daily/engine';
import { asEntry, displayWord } from '@/content/presentation';
import { levelPalettes, planets } from '@/theme/tokens';
import DailyWordWidget, { type DailyWordWidgetProps } from '@/widgets/DailyWordWidget';

function propsForWord(word: Word, favorites: readonly string[]): DailyWordWidgetProps {
  return {
    word: displayWord(word.word),
    pronunciation: word.pronunciation,
    definition: asEntry(word.definition),
    category: `${planets[word.type].label} · ${word.language}`.toUpperCase(),
    tint: levelPalettes[word.level].tint,
    slug: word.slug,
    liked: favorites.includes(word.slug),
  };
}

export function refreshDailyWordWidget(
  words: readonly Word[],
  favorites: readonly string[] = [],
): void {
  if (Platform.OS !== 'ios' || words.length === 0) return;

  const start = localDateString();
  const entries = Array.from({ length: 90 }, (_, offset) => {
    const dateString = addDays(start, offset);
    const word = wordOfDay(words, dateString);
    const date = new Date(`${dateString}T00:01:00`);
    return word ? { date, props: propsForWord(word, favorites) } : null;
  }).filter((entry): entry is { date: Date; props: DailyWordWidgetProps } => entry !== null);

  if (entries.length > 0) DailyWordWidget.updateTimeline(entries);
}
