/**
 * Which on-device voice reads a word aloud, from the word's `language`.
 *
 * Words are stored in Latin letters only, so a native voice is used only for
 * languages written in Latin script: a Japanese or Greek voice given romaji
 * or a transliteration spells it out or misreads it. Those languages (and
 * ones phones have no voice for) stay on English until a recorded
 * `audio_url` exists, which always wins over speech.
 */

const LOCALES: Record<string, string> = {
  'brazilian portuguese': 'pt-BR',
  portuguese: 'pt-PT',
  german: 'de-DE',
  french: 'fr-FR',
  spanish: 'es-ES',
  'latin american spanish': 'es-MX',
  italian: 'it-IT',
  dutch: 'nl-NL',
  danish: 'da-DK',
  norwegian: 'nb-NO',
  swedish: 'sv-SE',
  finnish: 'fi-FI',
  turkish: 'tr-TR',
  indonesian: 'id-ID',
  tagalog: 'fil-PH',
  welsh: 'cy-GB',
  irish: 'ga-IE',
  lithuanian: 'lt-LT',
  // Serbian written in Latin letters; Croatian voices read it natively and are more widely installed.
  serbian: 'hr-HR',
  'zulu / nguni': 'zu-ZA',
  // Closest living relative, same letters.
  'old norse': 'is-IS',
  // Spoken in Chile; Spanish phonetics read the transliteration well.
  yaghan: 'es-CL',
};

export const DEFAULT_LOCALE = 'en-US';

/** Preferred speech locale for a word's language, or English. */
export function speechLocaleFor(language: string): string {
  return LOCALES[language.trim().toLowerCase()] ?? DEFAULT_LOCALE;
}

/**
 * Pick a locale the device can actually speak: exact match, then the same
 * language in another region (pt-PT → pt-BR), then English. Never hand the
 * engine a locale it lacks, because iOS then silently uses a random default.
 */
export function resolveLocale(preferred: string, available: readonly string[]): string {
  if (preferred === DEFAULT_LOCALE) return DEFAULT_LOCALE;
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const want = norm(preferred);
  const voices = available.map(norm);
  if (voices.includes(want)) return preferred;
  const base = want.split('-')[0];
  const sibling = available.find((l) => norm(l).split('-')[0] === base);
  return sibling ?? DEFAULT_LOCALE;
}
