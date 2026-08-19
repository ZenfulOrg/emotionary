/** Show the action coachmark once the reader has completed three vertical swipes. */
export function shouldShowTodayActionCoachmark(index: number | null, alreadySeen: boolean): boolean {
  return !alreadySeen && index !== null && index >= 3;
}
