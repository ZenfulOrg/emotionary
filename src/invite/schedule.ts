import { daysSinceEpoch } from '@/daily/engine';

/**
 * When the share-with-a-friend pop-up shows.
 *
 * Three moments, each at most once: the first 7-day streak, the first word
 * card shared, and the first 30-day streak. A moment that happens waits in
 * `pending` until Today is quiet and the limits below allow it:
 *
 * - at most 3 pop-ups in total, at least 7 days apart;
 * - never in someone's first week;
 * - after two "Not now" taps only the 30-day streak may still ask (last ask).
 */
export type InviteMoment = 'streak7' | 'first_share' | 'streak30';

export interface InviteState {
  /** Moments that happened and still wait to be shown, oldest first. */
  pending: InviteMoment[];
  /** Every moment that has ever happened, so each fires only once. */
  reached: InviteMoment[];
  /** Local dates the pop-up was shown. */
  shownDates: string[];
  /** "Not now" taps. */
  dismissals: number;
}

export const EMPTY_INVITE_STATE: InviteState = { pending: [], reached: [], shownDates: [], dismissals: 0 };

export const INVITE_MAX_SHOWS = 3;
export const INVITE_MIN_GAP_DAYS = 7;
export const INVITE_FIRST_WEEK_DAYS = 7;
export const INVITE_MAX_DISMISSALS = 2;

/** Records a moment once; later repeats change nothing. */
export function reachMoment(state: InviteState, moment: InviteMoment): InviteState {
  if (state.reached.includes(moment)) return state;
  return { ...state, reached: [...state.reached, moment], pending: [...state.pending, moment] };
}

/** The streak moments a streak of this length has reached. */
export function streakMoments(streak: number): InviteMoment[] {
  const moments: InviteMoment[] = [];
  if (streak >= 7) moments.push('streak7');
  if (streak >= 30) moments.push('streak30');
  return moments;
}

/** The moment to show today, or null when nothing may show. */
export function nextInviteMoment(
  state: InviteState,
  today: string,
  welcomeDate: string | null,
): InviteMoment | null {
  if (state.pending.length === 0) return null;
  if (state.shownDates.length >= INVITE_MAX_SHOWS) return null;
  const day = daysSinceEpoch(today);
  if (welcomeDate && day - daysSinceEpoch(welcomeDate) < INVITE_FIRST_WEEK_DAYS) return null;
  const last = state.shownDates[state.shownDates.length - 1];
  if (last && day - daysSinceEpoch(last) < INVITE_MIN_GAP_DAYS) return null;
  if (state.dismissals >= INVITE_MAX_DISMISSALS) {
    return state.pending.includes('streak30') ? 'streak30' : null;
  }
  return state.pending[0];
}

/** The pop-up for this moment is on screen today. */
export function markShown(state: InviteState, moment: InviteMoment, today: string): InviteState {
  return {
    ...state,
    pending: state.pending.filter((item) => item !== moment),
    shownDates: [...state.shownDates, today],
  };
}

export function markDismissed(state: InviteState): InviteState {
  return { ...state, dismissals: state.dismissals + 1 };
}

/** The line above the headline for each moment. */
export const INVITE_EYEBROW: Record<InviteMoment | 'requested', string> = {
  streak7: '7 days in a row',
  first_share: 'You shared a word',
  streak30: '30 days in a row',
  requested: 'A word for a friend',
};
