export function wordTitleSize(word: string): number {
  const length = Array.from(word).length;
  if (length >= 18) return 34;
  if (length >= 15) return 39;
  if (length >= 12) return 45;
  if (length >= 10) return 50;
  return 56;
}
