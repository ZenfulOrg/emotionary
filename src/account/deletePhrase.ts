/** What someone must type before their account can be deleted. */
export const DELETE_PHRASE = 'delete my account';

/** Spaces and capitals don't matter: "Delete my account " counts. */
export function matchesDeletePhrase(text: string): boolean {
  return text.trim().replace(/\s+/g, ' ').toLowerCase() === DELETE_PHRASE;
}
