/**
 * The word is set huge and on one line; longer words step down so every
 * word fits a phone width without relying on native auto-fit alone.
 */
export function wordTitleSize(word: string): number {
  const length = Array.from(word).length;
  if (length >= 18) return 38;
  if (length >= 15) return 44;
  if (length >= 12) return 52;
  if (length >= 10) return 62;
  if (length >= 8) return 74;
  return 84;
}
