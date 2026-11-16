import type { Word } from '@/content/types';
import {
  addDays,
  cycleFor,
  DECK_EPOCH,
  daysSinceEpoch,
  fnv1a,
  localDateString,
  seededShuffle,
  wordOfDay,
} from '@/daily/engine';

import seedJson from '../../../assets/seed/words.json';

const seedWords = (seedJson as { words: Word[] }).words;

function makeWord(slug: string, publishedAt: string): Word {
  return {
    id: `fixture-${slug}`,
    slug,
    word: slug,
    pronunciation: slug,
    language: 'English',
    type: 'hidden_english',
    level: 1,
    definition: `def ${slug}`,
    wisdom: `wisdom ${slug}`,
    is_free: true,
    published_at: publishedAt,
    updated_at: publishedAt,
  };
}

const OLD = '2025-12-01T00:00:00.000Z';
const FIXTURE = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'].map((s) =>
  makeWord(s, OLD),
);

/** The daily words for `days` consecutive days starting at `from`. */
function run(words: readonly Word[], from: string, days: number): string[] {
  const cache = new Map<string, Word[]>();
  return Array.from({ length: days }, (_, i) => wordOfDay(words, addDays(from, i), cache)?.slug ?? '');
}

describe('protocol primitives (GOLDEN — changing any value requires bumping SEED_PREFIX)', () => {
  test('fnv1a matches the standard test vector', () => {
    expect(fnv1a('abc')).toBe(440920331); // 0x1a47e90b, canonical FNV-1a vector
  });

  test('seededShuffle is pinned', () => {
    expect(seededShuffle(['a', 'b', 'c', 'd', 'e'], 'emotionary-v1:test')).toEqual([
      'a',
      'e',
      'b',
      'c',
      'd',
    ]);
  });

  test('daysSinceEpoch is pure date-component math', () => {
    expect(daysSinceEpoch('1970-01-01')).toBe(0);
    expect(daysSinceEpoch('2026-07-03')).toBe(20637);
    expect(daysSinceEpoch('2028-02-29')).toBe(21243); // leap day
  });

  test('golden: the first two cycles for a fixed synthetic word list', () => {
    expect(run(FIXTURE, DECK_EPOCH, 16)).toMatchInlineSnapshot(`
[
  "alpha",
  "hotel",
  "bravo",
  "charlie",
  "golf",
  "delta",
  "foxtrot",
  "echo",
  "alpha",
  "bravo",
  "foxtrot",
  "charlie",
  "hotel",
  "echo",
  "delta",
  "golf",
]
`);
  });
});

describe('deck rotation', () => {
  test('every word appears exactly once per cycle', () => {
    const words = seedWords;
    const cycleOne = run(words, DECK_EPOCH, words.length);
    expect(new Set(cycleOne).size).toBe(words.length);
    const cycleTwo = run(words, addDays(DECK_EPOCH, words.length), words.length);
    expect(new Set(cycleTwo).size).toBe(words.length);
  });

  test('a word published mid-cycle waits for the next cycle, then appears once', () => {
    const midCycle = addDays(DECK_EPOCH, 3);
    const added = makeWord('india', `${midCycle}T09:00:00.000Z`);
    const before = run(FIXTURE, DECK_EPOCH, FIXTURE.length);
    const after = run([...FIXTURE, added], DECK_EPOCH, FIXTURE.length);
    expect(after).toEqual(before); // the current cycle is untouched
    expect(after).not.toContain('india');

    const next = run([...FIXTURE, added], addDays(DECK_EPOCH, FIXTURE.length), FIXTURE.length + 1);
    expect(next.filter((slug) => slug === 'india')).toHaveLength(1);
    expect(new Set(next).size).toBe(FIXTURE.length + 1);
  });

  test('no word repeats across a cycle boundary (many cycles, small pool)', () => {
    const pool = FIXTURE.slice(0, 3);
    const days = run(pool, DECK_EPOCH, 3 * 60);
    for (let i = 1; i < days.length; i++) expect(days[i]).not.toBe(days[i - 1]);
  });

  test('word list order does not matter', () => {
    const shuffled = [...FIXTURE].reverse();
    expect(run(shuffled, DECK_EPOCH, 20)).toEqual(run(FIXTURE, DECK_EPOCH, 20));
  });

  test('same answer with a shared or a fresh cache', () => {
    const date = addDays(DECK_EPOCH, 37);
    const shared = new Map<string, Word[]>();
    run(FIXTURE, DECK_EPOCH, 40); // warm nothing; fresh path
    wordOfDay(FIXTURE, addDays(DECK_EPOCH, 5), shared);
    expect(wordOfDay(FIXTURE, date, shared)?.slug).toBe(wordOfDay(FIXTURE, date)?.slug);
  });

  test('dates before the deck epoch still get a word', () => {
    expect(wordOfDay(FIXTURE, '2026-07-03')).not.toBeNull();
    expect(cycleFor(FIXTURE, '2026-07-03')?.start).toBe(DECK_EPOCH);
  });
});

describe('bootstrap fallbacks', () => {
  test('nothing published before the cycle → all words (no empty rotation)', () => {
    const fresh = FIXTURE.map((w) => ({ ...w, published_at: '2030-01-01T00:00:00.000Z' }));
    expect(wordOfDay(fresh, DECK_EPOCH)).not.toBeNull();
  });

  test('zero words → null (never a crash)', () => {
    expect(wordOfDay([], DECK_EPOCH)).toBeNull();
  });

  test('invalid published_at values are excluded, not fatal', () => {
    const words = [...FIXTURE, { ...makeWord('broken', OLD), published_at: 'not-a-date' }];
    expect(run(words, DECK_EPOCH, FIXTURE.length)).not.toContain('broken');
  });
});

describe('date helpers', () => {
  test('addDays crosses months, years, DST transition dates as pure calendar math', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  test('localDateString formats a Date in local calendar terms', () => {
    expect(localDateString(new Date(2026, 6, 3, 23, 59))).toBe('2026-07-03');
  });
});
