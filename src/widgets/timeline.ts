import { Platform } from 'react-native';

import type { Word } from '@/content/types';
import { addDays, localDateString } from '@/daily/engine';
import { todaysWordFor } from '@/daily/welcome';
import { canBrowseWord } from '@/entitlements';
import { LOCKED_WIDGET_LINE, type WidgetAccess } from '@/widgets/access';
import { asEntry, displayWord } from '@/content/presentation';
import { levelPalettes, planets } from '@/theme/tokens';
import DailyWordWidget, { type DailyWordWidgetProps } from '@/widgets/DailyWordWidget';

function propsForWord(
  word: Word,
  favorites: readonly string[],
  unlocked: boolean,
): DailyWordWidgetProps {
  return {
    word: displayWord(word.word),
    pronunciation: word.pronunciation,
    definition: unlocked ? asEntry(word.definition) : LOCKED_WIDGET_LINE,
    category: `${planets[word.type].label} · ${word.language}`.toUpperCase(),
    tint: levelPalettes[word.level].tint,
    slug: word.slug,
    liked: favorites.includes(word.slug),
  };
}

export function refreshDailyWordWidget(
  words: readonly Word[],
  favorites: readonly string[] = [],
  access: WidgetAccess = { hasFullAccess: true, kept: [] },
): void {
  if (Platform.OS !== 'ios' || words.length === 0) return;
  const kept = new Set(access.kept);

  const start = localDateString();
  const entries = Array.from({ length: 90 }, (_, offset) => {
    const dateString = addDays(start, offset);
    const word = todaysWordFor(words, dateString, access.welcomeDate ?? null);
    const date = new Date(`${dateString}T00:01:00`);
    return word
      ? { date, props: propsForWord(word, favorites, canBrowseWord(word, access.hasFullAccess, kept)) }
      : null;
  }).filter((entry): entry is { date: Date; props: DailyWordWidgetProps } => entry !== null);

  if (entries.length > 0) DailyWordWidget.updateTimeline(entries);
}
