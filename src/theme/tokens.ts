import type { Level, WordType } from '@/content/types';

/**
 * Emotionary design tokens — measured from the September 2026 brand guide.
 *
 * Two grounds (cream, ink), one signature (acid), an orbit of accents.
 * Two families: Cormorant Garamond is the voice, DM Mono is the whisper.
 * Circles are the only round thing — every other surface is square.
 *
 * Contrast notes (WCAG, measured):
 *   ink on cream 11.4:1 · cream on ink 11.4:1 · ink on acid 7.9:1
 *   acid on ink 7.9:1 (labels only) · blue on cream 5.1:1
 *   acid on cream 1.5:1 — never as text · cream on rust 3.2:1 — display only
 */
export const brand = {
  cream: '#F5F0E6',
  ink: '#18334D',
  acid: '#F5C400',
  rust: '#D95F68',
  blue: '#1F6B9E',
  pink: '#E9828C',
  teal: '#27917F',
} as const;

export type GroundName = 'cream' | 'ink';

export interface Ground {
  name: GroundName;
  background: string;
  /** primary text — 11.4:1 */
  text: string;
  /** secondary text — ≥ 6:1 */
  textMuted: string;
  /** decorative text and disabled states only — never body copy */
  textFaint: string;
  /** 1px rules and box outlines */
  hairline: string;
  /** mono eyebrows — blue on cream, acid on ink */
  eyebrow: string;
  /** a pressed / selected wash for square surfaces */
  wash: string;
  statusBar: 'dark' | 'light';
}

export const grounds: Record<GroundName, Ground> = {
  cream: {
    name: 'cream',
    background: brand.cream,
    text: brand.ink,
    textMuted: '#495D6F', // ink @ 78% — 6.0:1
    textFaint: '#707F8A', // ink @ 60% — 3.6:1
    hairline: '#D3D4D0', // ink @ 16%
    eyebrow: brand.blue,
    wash: 'rgba(24, 51, 77, 0.06)',
    statusBar: 'dark',
  },
  ink: {
    name: 'ink',
    background: brand.ink,
    text: brand.cream,
    textMuted: '#B7BBBB', // cream @ 72% — 6.7:1
    textFaint: '#87929A', // cream @ 50% — 4.1:1
    hairline: '#3B5165', // cream @ 16%
    eyebrow: brand.acid,
    wash: 'rgba(245, 240, 230, 0.07)',
    statusBar: 'light',
  },
};

/** The scrim behind dialogs and the share sheet: ink, nearly opaque. */
export const scrim = 'rgba(24, 51, 77, 0.94)';

export interface LevelPalette {
  /** the mood color: dots, rules, the share-card accent */
  accent: string;
  /** a whisper of the mood on cream — ink text stays ≥ 9.7:1 */
  tint: string;
  name: string;
  description: string;
}

/** Color-depth levels: one mood color each, washed 12% into cream. */
export const levelPalettes: Record<Level, LevelPalette> = {
  1: {
    accent: brand.acid,
    tint: '#F5EBCA',
    name: 'Fleeting',
    description: 'Light, fleeting, surface sensations',
  },
  2: {
    accent: brand.pink,
    tint: '#F4E3DB',
    name: 'Undercurrents',
    description: 'Present but subtle, humming beneath the surface',
  },
  3: {
    accent: brand.teal,
    tint: '#DCE5DA',
    name: 'In-between',
    description: 'Complex, mixed, pulling in two directions at once',
  },
  4: {
    accent: brand.blue,
    tint: '#DBE0DD',
    name: 'The weight',
    description: 'Heavy, slow, demanding your full attention',
  },
  5: {
    accent: brand.rust,
    tint: '#F2DFD7',
    name: 'The depths',
    description: 'The most intense, transformative human experiences',
  },
};

export const LEVELS = [1, 2, 3, 4, 5] as const satisfies readonly Level[];

/**
 * The three planets are the mark *and* the categories — always in this
 * order, always these sizes. Never reorder, recolor, or add a fourth.
 */
export const planets: Record<WordType, { color: string; size: number; label: string; body: string }> =
  {
    wanderword: {
      color: brand.acid,
      size: 11,
      label: 'Wanderword',
      body: 'A word from another language or culture with no direct English equivalent.',
    },
    psychology: {
      color: brand.blue,
      size: 9,
      label: 'Psychology',
      body: 'A term from the study of the mind, made simple for everyday use.',
    },
    hidden_english: {
      color: brand.pink,
      size: 7,
      label: 'Hidden English',
      body: 'A real English word that rarely makes it into everyday conversation.',
    },
  };

export const PLANET_ORDER = ['wanderword', 'psychology', 'hidden_english'] as const satisfies readonly WordType[];

export const font = {
  /** the voice — display: headlines, the word, the wordmark */
  display: 'CormorantGaramond_500Medium',
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  displayStrong: 'CormorantGaramond_600SemiBold',
  /** the voice — text: definitions, body copy */
  text: 'CormorantGaramond_400Regular',
  textItalic: 'CormorantGaramond_400Regular_Italic',
  /** the whisper — eyebrows, meta rows, buttons, pronunciation */
  mono: 'DMMono_400Regular',
  monoLight: 'DMMono_300Light',
} as const;

/** Letter spacing in points from an em value — "bigger gets tighter". */
export function tracking(fontSize: number, em: number): number {
  return Math.round(fontSize * em * 100) / 100;
}

/**
 * The type scale, adapted from the site's 1440px canvas to a phone.
 * Cormorant's small x-height means text sizes sit a step above the usual.
 */
export const type = {
  word: 64,
  hero: 44,
  headline: 34,
  title: 26,
  definition: 23,
  lead: 20,
  body: 18,
  small: 16,
  eyebrow: 11,
  micro: 10,
} as const;

export const space = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Page gutter and the minimum touch target. */
export const layout = {
  gutter: 24,
  touch: 44,
  maxWidth: 440,
  hairline: 1,
} as const;

export const motion = {
  /** the orbit turns once every 24 seconds */
  orbitMs: 24000,
  /** the planets breathe */
  breatheMs: 3200,
  /** the rule that draws itself */
  ruleMs: 700,
} as const;
