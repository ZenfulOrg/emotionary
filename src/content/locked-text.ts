/** Text helpers for a locked meaning: what may be read, and stand-ins for the rest. */

/**
 * Stand-in text with the same rhythm as the real text: words of the same
 * lengths, letters replaced. The hidden part of a definition is never
 * rendered while locked, so the blur can't be read through, copied, or
 * spoken aloud.
 */
export function placeholderText(source: string): string {
  const letters = 'aeinorstlu';
  let i = 0;
  return source.replace(/\p{L}/gu, () => letters[(i += 3) % letters.length]);
}

/**
 * The readable start of a definition: about a third of its words, at least
 * three and at most six, always leaving at least two hidden. The last lead
 * word loses trailing punctuation, since the app adds an ellipsis.
 */
export function splitLead(definition: string): { lead: string[]; rest: string } {
  const words = definition.trim().split(/\s+/);
  if (words.length <= 4) return { lead: [], rest: definition };
  const count = Math.min(6, Math.max(3, Math.round(words.length / 3)));
  const leadCount = Math.min(count, words.length - 2);
  const lead = words.slice(0, leadCount);
  // The lead ends in "…", so drop trailing punctuation ("soul;" → "soul").
  lead[lead.length - 1] = lead[lead.length - 1].replace(/[\p{P}]+$/u, '') || lead[lead.length - 1];
  return { lead, rest: words.slice(leadCount).join(' ') };
}
