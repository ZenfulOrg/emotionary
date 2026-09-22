/**
 * Brand voice for content: the word lowercase and huge, the definition
 * lowercase and ending in a period. Content stays untouched in the store —
 * this is presentation only, and screen readers still get the original.
 */
export function displayWord(word: string): string {
  return word.toLocaleLowerCase();
}

export function asEntry(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return trimmed;
  const firstWord = /^[^\s,.;:!?]+/.exec(trimmed)?.[0] ?? '';
  // Leave the pronoun "I" and acronyms alone: only soften a capital that
  // starts an ordinary word.
  const keep =
    firstWord === 'I' ||
    /^I['’]/.test(firstWord) ||
    (firstWord.length > 1 && firstWord === firstWord.toLocaleUpperCase());
  const softened = keep ? trimmed : trimmed.charAt(0).toLocaleLowerCase() + trimmed.slice(1);
  return /[.!?…"”’)]$/.test(softened) ? softened : `${softened}.`;
}
