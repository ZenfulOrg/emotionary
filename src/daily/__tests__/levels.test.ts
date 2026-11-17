import type { Level, Word } from '@/content/types';
import {
  addDays,
  deckWordOfDay,
  deepDays,
  easter,
  holidays,
  isGentleDay,
  LEVELS_START,
  monthKey,
  weekday,
  wordOfDay,
} from '@/daily/engine';

/** A library shaped like production: 385 words, 311 light (1-3), 74 deep (4-5). */
const MIX: Record<Level, number> = { 1: 135, 2: 95, 3: 81, 4: 59, 5: 15 };

function makeWord(slug: string, level: Level, publishedAt = '2026-01-01T00:00:00.000Z'): Word {
  return {
    id: `id-${slug}`,
    slug,
    word: slug,
    pronunciation: slug,
    language: 'English',
    type: 'hidden_english',
    level,
    definition: `def ${slug}`,
    wisdom: `wisdom ${slug}`,
    is_free: false,
    published_at: publishedAt,
    updated_at: publishedAt,
  };
}

const LIBRARY: Word[] = (Object.entries(MIX) as [string, number][]).flatMap(([level, count]) =>
  Array.from({ length: count }, (_, i) => makeWord(`l${level}-${i}`, Number(level) as Level)),
);

function days(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

const YEAR = days(LEVELS_START, 365);
const TWO_YEARS = days(LEVELS_START, 730);
const picks = (dates: string[], words: readonly Word[] = LIBRARY) =>
  dates.map((date) => ({ date, word: wordOfDay(words, date)! }));

describe('holidays', () => {
  test('US federal holidays plus the family ones, on the right dates', () => {
    const y2027 = holidays(2027);
    for (const date of [
      '2027-01-01', // New Year's Day
      '2027-01-18', // MLK Day (3rd Monday)
      '2027-02-14', // Valentine's Day
      '2027-02-15', // Presidents' Day (3rd Monday)
      '2027-03-28', // Easter
      '2027-05-09', // Mother's Day (2nd Sunday)
      '2027-05-31', // Memorial Day (last Monday)
      '2027-06-19', // Juneteenth
      '2027-06-20', // Father's Day (3rd Sunday)
      '2027-07-04', // Independence Day
      '2027-09-06', // Labor Day (1st Monday)
      '2027-10-11', // Columbus / Indigenous Peoples' Day (2nd Monday)
      '2027-10-31', // Halloween
      '2027-11-11', // Veterans Day
      '2027-11-24', // Thanksgiving Eve
      '2027-11-25', // Thanksgiving (4th Thursday)
      '2027-12-24', // Christmas Eve
      '2027-12-25', // Christmas
      '2027-12-31', // New Year's Eve
    ]) {
      expect(y2027.has(date)).toBe(true);
    }
    expect(y2027.size).toBe(19);
    expect(holidays(2026).has('2026-11-26')).toBe(true); // Thanksgiving 2026
    expect(holidays(2026).has('2026-11-25')).toBe(true); // and its eve
  });

  test('Easter matches known dates', () => {
    expect(easter(2026)).toBe('2026-04-05');
    expect(easter(2027)).toBe('2027-03-28');
    expect(easter(2028)).toBe('2028-04-16');
    expect(easter(2030)).toBe('2030-04-21');
  });

  test('weekends are gentle; ordinary weekdays are not', () => {
    expect(weekday(LEVELS_START)).toBe(1); // the rules start on a Monday
    expect(isGentleDay('2026-12-05')).toBe(true); // Saturday
    expect(isGentleDay('2026-12-06')).toBe(true); // Sunday
    expect(isGentleDay('2026-12-08')).toBe(false); // Tuesday
    expect(isGentleDay('2026-12-24')).toBe(true); // Christmas Eve, a Thursday
  });
});

describe('level rules over a full year', () => {
  const year = picks(YEAR);

  test('about 85% light and 15% deep', () => {
    const deep = year.filter(({ word }) => word.level >= 4).length;
    expect(deep / year.length).toBeGreaterThan(0.12);
    expect(deep / year.length).toBeLessThan(0.17);
  });

  test('4 or 5 deep days in every full month', () => {
    const byMonth = new Map<string, number>();
    for (const { date, word } of year) {
      if (word.level >= 4) byMonth.set(monthKey(date), (byMonth.get(monthKey(date)) ?? 0) + 1);
    }
    for (const month of new Set(YEAR.map(monthKey))) {
      if (month === monthKey(LEVELS_START) || month === monthKey(YEAR[YEAR.length - 1])) continue;
      expect([4, 5]).toContain(byMonth.get(month) ?? 0);
    }
  });

  test('level 5 at most once a month', () => {
    const fives = new Map<string, number>();
    for (const { date, word } of year) {
      if (word.level === 5) fives.set(monthKey(date), (fives.get(monthKey(date)) ?? 0) + 1);
    }
    for (const count of fives.values()) expect(count).toBeLessThanOrEqual(1);
    expect(fives.size).toBeGreaterThanOrEqual(11); // nearly every month has its one
  });

  test('never two deep days in a row', () => {
    for (let i = 1; i < year.length; i++) {
      expect(year[i - 1].word.level >= 4 && year[i].word.level >= 4).toBe(false);
    }
  });

  test('weekends and holidays use levels 1-2 only', () => {
    const gentle = year.filter(({ date }) => isGentleDay(date));
    expect(gentle.length).toBeGreaterThan(110);
    for (const { word } of gentle) expect(word.level).toBeLessThanOrEqual(2);
  });

  test('ordinary light days still draw from all of levels 1-3', () => {
    const levels = new Set(year.filter(({ word }) => word.level <= 3).map(({ word }) => word.level));
    expect([...levels].sort()).toEqual([1, 2, 3]);
  });

  test('every deep day matches the month plan', () => {
    for (const { date, word } of year) {
      const planned = deepDays(monthKey(date)).get(date);
      if (planned) expect(word.level).toBe(planned);
      else expect(word.level).toBeLessThanOrEqual(3);
    }
  });
});

describe('no repeats until the group has cycled', () => {
  const twoYears = picks(TWO_YEARS);
  const group = (level: number) =>
    level <= 2 ? 'light12' : level === 3 ? 'light3' : level === 4 ? 'deep4' : 'deep5';
  const size = { light12: 230, light3: 81, deep4: 59, deep5: 15 };

  test('each round of a group has every word exactly once', () => {
    const draws: Record<string, string[]> = { light12: [], light3: [], deep4: [], deep5: [] };
    for (const { word } of twoYears) draws[group(word.level)].push(word.slug);
    for (const [name, seq] of Object.entries(draws)) {
      const n = size[name as keyof typeof size];
      for (let start = 0; start < seq.length; start += n) {
        const round = seq.slice(start, start + n);
        // No repeats inside a round; a full round has the whole group.
        expect(new Set(round).size).toBe(round.length);
        if (round.length === n) expect(new Set(round).size).toBe(n);
      }
    }
  });

  test('both light decks go round at about the same pace', () => {
    const year = picks(YEAR);
    const twelve = year.filter(({ word }) => word.level <= 2).length / 230;
    const three = year.filter(({ word }) => word.level === 3).length / 81;
    expect(Math.abs(twelve - three)).toBeLessThan(0.1);
  });

  test('every light word gets its day within two years', () => {
    const light = new Set(twoYears.filter(({ word }) => word.level <= 3).map(({ word }) => word.slug));
    expect(light.size).toBe(311);
  });

  test('no word two days running', () => {
    for (let i = 1; i < twoYears.length; i++) {
      expect(twoYears[i].word.slug).not.toBe(twoYears[i - 1].word.slug);
    }
  });
});

describe('the same answer everywhere', () => {
  test('input order and caching do not change the word', () => {
    const reversed = [...LIBRARY].reverse();
    const sample = days(addDays(LEVELS_START, 40), 30);
    expect(sample.map((date) => wordOfDay(reversed, date)?.slug)).toEqual(
      sample.map((date) => wordOfDay(LIBRARY, date)?.slug),
    );
    // Asking for a far date first, then an early one, gives the same picks.
    const fresh = [...LIBRARY];
    wordOfDay(fresh, addDays(LEVELS_START, 300));
    expect(wordOfDay(fresh, addDays(LEVELS_START, 3))?.slug).toBe(
      wordOfDay(LIBRARY, addDays(LEVELS_START, 3))?.slug,
    );
  });

  test('days before the start keep the previous rotation', () => {
    for (const date of days('2026-11-16', 14)) {
      expect(wordOfDay(LIBRARY, date)?.slug).toBe(deckWordOfDay(LIBRARY, date)?.slug);
    }
  });

  test('a newly published word changes nothing before it joins a deal', () => {
    const added = makeWord('brand-new', 1, `${addDays(LEVELS_START, 100)}T12:00:00.000Z`);
    const before = days(LEVELS_START, 100).map((date) => wordOfDay(LIBRARY, date)?.slug);
    const after = days(LEVELS_START, 100).map((date) => wordOfDay([...LIBRARY, added], date)?.slug);
    expect(after).toEqual(before);
  });

  test('tiny or lopsided libraries still always get a word', () => {
    const onlyDeep = [makeWord('heavy', 5), makeWord('weighty', 4)];
    const onlyThree = [makeWord('mid-a', 3), makeWord('mid-b', 3)];
    for (const date of days(LEVELS_START, 60)) {
      expect(wordOfDay(onlyDeep, date)).not.toBeNull();
      expect(wordOfDay(onlyThree, date)).not.toBeNull();
    }
    expect(wordOfDay([], LEVELS_START)).toBeNull();
  });

  test('a year of days is quick to work out', () => {
    const started = Date.now();
    wordOfDay([...LIBRARY], addDays(LEVELS_START, 3 * 365));
    expect(Date.now() - started).toBeLessThan(1500);
  });
});
