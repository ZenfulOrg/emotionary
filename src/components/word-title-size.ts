/**
 * Cormorant's lowercase advances average under half an em; 0.5 leaves room
 * for wide letters (m, w) so a capped word never clips.
 */
const AVERAGE_GLYPH_EM = 0.5;

/**
 * The word is set huge and on one line; longer words step down, and when a
 * width is given the size is capped so the word always fits it. Native
 * auto-fit is not used: on iOS it can collapse the word to a sliver.
 */
export function wordTitleSize(word: string, maxWidth?: number): number {
  const length = Array.from(word).length;
  let size = 84;
  if (length >= 18) size = 38;
  else if (length >= 15) size = 44;
  else if (length >= 12) size = 52;
  else if (length >= 10) size = 62;
  else if (length >= 8) size = 74;
  if (maxWidth && length > 0) {
    size = Math.min(size, Math.floor(maxWidth / (length * AVERAGE_GLYPH_EM)));
  }
  return size;
}
