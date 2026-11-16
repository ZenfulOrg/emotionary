import type { Word } from '@/content/types';
import { addDays, wordOfDay } from '@/daily/engine';
import { buildTodayFeed } from '@/daily/today-feed';
import { WELCOME_DAYS, WELCOME_SLUGS, todaysWordFor, welcomeWords } from '@/daily/welcome';

import seedJson from '../../../assets/seed/words.json';

const seedWords = (seedJson as { words: Word[] }).words;
const START = '2026-11-16';

test('every curated slug is a published word and none are on the free shelf', () => {
  for (const slug of WELCOME_SLUGS) {
    const word = seedWords.find((w) => w.slug === slug);
    expect(word).toBeDefined();
    expect(word?.is_free).toBe(false);
  }
});

test('the first two weeks deal fourteen different curated words, in order', () => {
  const days = Array.from({ length: WELCOME_DAYS }, (_, i) =>
    todaysWordFor(seedWords, addDays(START, i), START)?.slug,
  );
  expect(days).toEqual(WELCOME_SLUGS.slice(0, WELCOME_DAYS));
  expect(new Set(days).size).toBe(WELCOME_DAYS);
});

test('day 15 joins the shared daily word', () => {
  const day15 = addDays(START, WELCOME_DAYS);
  expect(todaysWordFor(seedWords, day15, START)).toEqual(wordOfDay(seedWords, day15));
});

test('people who joined before welcome words keep the shared daily word', () => {
  expect(todaysWordFor(seedWords, START, null)).toEqual(wordOfDay(seedWords, START));
});

test('an unpublished curated word is skipped without leaving a gap', () => {
  const without = seedWords.filter((w) => w.slug !== WELCOME_SLUGS[0]);
  expect(todaysWordFor(without, START, START)?.slug).toBe(WELCOME_SLUGS[1]);
  expect(welcomeWords(without)).toHaveLength(WELCOME_DAYS);
});

test('Today leads with the welcome word and still lists every free word', () => {
  const feed = buildTodayFeed(seedWords, START, false, 1, START);
  const slugs = feed.flatMap((item) => (item.kind === 'word' ? [item.word.slug] : []));
  expect(slugs[0]).toBe(WELCOME_SLUGS[0]);
  const free = seedWords.filter((w) => w.is_free).map((w) => w.slug);
  for (const slug of free) expect(slugs).toContain(slug);
});
