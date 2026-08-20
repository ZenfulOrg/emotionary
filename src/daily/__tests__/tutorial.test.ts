import { shouldShowTodayActionCoachmark } from '@/daily/tutorial';

describe('Today action coachmark', () => {
  it('appears after the third swipe from the first card', () => {
    expect(shouldShowTodayActionCoachmark(2, false)).toBe(false);
    expect(shouldShowTodayActionCoachmark(3, false)).toBe(true);
  });

  it('does not reappear after it has been seen', () => {
    expect(shouldShowTodayActionCoachmark(3, true)).toBe(false);
    expect(shouldShowTodayActionCoachmark(10, true)).toBe(false);
  });
});
