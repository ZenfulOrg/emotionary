import {
  EMPTY_INVITE_STATE,
  markDismissed,
  markShown,
  nextInviteMoment,
  reachMoment,
  streakMoments,
  type InviteState,
} from '@/invite/schedule';

const WELCOME = '2026-11-01';

function reach(...moments: Parameters<typeof reachMoment>[1][]): InviteState {
  return moments.reduce(reachMoment, EMPTY_INVITE_STATE);
}

describe('invite schedule', () => {
  it('shows nothing until a moment is reached', () => {
    expect(nextInviteMoment(EMPTY_INVITE_STATE, '2026-11-20', WELCOME)).toBeNull();
  });

  it('shows the 7-day streak moment', () => {
    expect(nextInviteMoment(reach('streak7'), '2026-11-08', WELCOME)).toBe('streak7');
  });

  it('never shows in the first week, but keeps the moment for later', () => {
    const state = reach('first_share');
    expect(nextInviteMoment(state, '2026-11-03', WELCOME)).toBeNull();
    expect(nextInviteMoment(state, '2026-11-07', WELCOME)).toBeNull();
    expect(nextInviteMoment(state, '2026-11-08', WELCOME)).toBe('first_share');
  });

  it('reaches each moment only once', () => {
    const state = reachMoment(reach('streak7'), 'streak7');
    expect(state.pending).toEqual(['streak7']);
    const shown = markShown(state, 'streak7', '2026-11-08');
    expect(reachMoment(shown, 'streak7').pending).toEqual([]);
  });

  it('waits at least 7 days between pop-ups', () => {
    let state = markShown(reach('streak7'), 'streak7', '2026-11-08');
    state = reachMoment(state, 'first_share');
    expect(nextInviteMoment(state, '2026-11-10', WELCOME)).toBeNull();
    expect(nextInviteMoment(state, '2026-11-14', WELCOME)).toBeNull();
    expect(nextInviteMoment(state, '2026-11-15', WELCOME)).toBe('first_share');
  });

  it('shows at most 3 times', () => {
    let state: InviteState = { ...EMPTY_INVITE_STATE, shownDates: ['2026-11-08', '2026-11-15', '2026-11-22'] };
    state = reachMoment(state, 'streak30');
    expect(nextInviteMoment(state, '2026-12-30', WELCOME)).toBeNull();
  });

  it('after two Not now taps only the 30-day streak asks', () => {
    let state = reach('streak7', 'first_share');
    state = markDismissed(markShown(state, 'streak7', '2026-11-08'));
    state = reachMoment(state, 'streak30');
    state = markDismissed(markShown(state, 'first_share', '2026-11-15'));
    // A leftover moment would not show; the 30-day streak still does.
    state = { ...state, pending: ['first_share', ...state.pending] };
    expect(nextInviteMoment(state, '2026-12-01', WELCOME)).toBe('streak30');
    expect(nextInviteMoment({ ...state, pending: ['first_share'] }, '2026-12-01', WELCOME)).toBeNull();
  });

  it('shows the oldest waiting moment first', () => {
    expect(nextInviteMoment(reach('first_share', 'streak7'), '2026-11-20', WELCOME)).toBe('first_share');
  });

  it('works without a welcome date (older installs)', () => {
    expect(nextInviteMoment(reach('streak7'), '2026-11-20', null)).toBe('streak7');
  });

  it('maps streak length to moments', () => {
    expect(streakMoments(6)).toEqual([]);
    expect(streakMoments(7)).toEqual(['streak7']);
    expect(streakMoments(30)).toEqual(['streak7', 'streak30']);
  });
});
