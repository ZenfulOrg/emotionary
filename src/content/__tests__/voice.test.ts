import { DEFAULT_LOCALE, resolveLocale, speechLocaleFor } from '@/content/voice';

describe('speechLocaleFor', () => {
  test('uses native voices for Latin-script languages', () => {
    expect(speechLocaleFor('Brazilian Portuguese')).toBe('pt-BR');
    expect(speechLocaleFor('Portuguese')).toBe('pt-PT');
    expect(speechLocaleFor('German')).toBe('de-DE');
    expect(speechLocaleFor(' welsh ')).toBe('cy-GB');
  });

  test('keeps English for non-Latin scripts and unknown languages', () => {
    for (const language of ['Japanese', 'Greek', 'Persian', 'Arabic', 'Russian', 'Hebrew', 'Iroquoian', 'English (rare)']) {
      expect(speechLocaleFor(language)).toBe(DEFAULT_LOCALE);
    }
  });
});

describe('resolveLocale', () => {
  test('exact match', () => {
    expect(resolveLocale('pt-BR', ['en-US', 'pt-BR'])).toBe('pt-BR');
  });

  test('same language, other region', () => {
    expect(resolveLocale('pt-PT', ['en-US', 'pt-BR'])).toBe('pt-BR');
    expect(resolveLocale('es-CL', ['es_ES'])).toBe('es_ES');
  });

  test('falls back to English when the device has no such voice', () => {
    expect(resolveLocale('cy-GB', ['en-US', 'fr-FR'])).toBe(DEFAULT_LOCALE);
  });
});
