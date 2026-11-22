import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isSimulator } from '@/dev/simulator';

import { daysSinceEpoch, localDateString } from '@/daily/engine';
import { nextStreak, type StreakState } from '@/store/streak';
import {
  EMPTY_INVITE_STATE,
  markDismissed,
  markShown,
  reachMoment,
  streakMoments,
  type InviteMoment,
  type InviteState,
} from '@/invite/schedule';

export interface NotifTime {
  hour: number;
  minute: number;
}

/** Most reminders a day someone can set (the daily word plus reminders). */
export const MAX_NOTIF_TIMES = 4;

const minutesOf = (time: NotifTime) => time.hour * 60 + time.minute;

/**
 * Every reminder time of the day, earliest first, without repeats. The first
 * brings the day's word; the later ones remind of it.
 */
export function sortedNotifTimes(times: readonly NotifTime[]): NotifTime[] {
  const seen = new Set<number>();
  return [...times]
    .sort((a, b) => minutesOf(a) - minutesOf(b))
    .filter((time) => {
      const key = minutesOf(time);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_NOTIF_TIMES);
}

interface UserState {
  onboarded: boolean;
  /** Local date onboarding finished; that day opens on the welcome word. */
  welcomeDate: string | null;
  /** Has swiped past Today's first word at least once (retires the scroll cue). */
  feedScrolled: boolean;
  favorites: string[]; // slugs, insertion order
  readSlugs: string[]; // unique slugs ever read
  /** Words a free user keeps after they stop being free (read or saved while free). */
  keptSlugs: string[];
  /** One-time grant of the pre-1.7.1 free words this user had read or saved. */
  keptLegacyDone: boolean;
  sharedCount: number;
  lastSharedBySlug: Record<string, string>; // slug -> last local date shared
  streakState: StreakState;
  /** Local date on which a running streak was last broken (for the wilt visual). */
  streakBrokeDate: string | null;
  /** The daily word's time. */
  notifTime: NotifTime;
  /** Extra reminder times of the day, besides notifTime (at most three). */
  extraNotifTimes: NotifTime[];
  notifEnabled: boolean;
  /** Local dates the app was opened, the last few weeks only. */
  openDays: string[];
  /** The share-with-a-friend pop-up: moments reached, shows and "Not now" taps (see invite/schedule). */
  invite: InviteState;
  /**
   * Opened from a notification or the widget: Today shows this word first and
   * celebrates it (confetti, haptic, streak, scroll cue). Not persisted.
   */
  celebrateSlug: string | null;
  /** Bumped per celebration so the same word can celebrate twice. Not persisted. */
  celebrateRun: number;
  /** The invite link was opened: Today shows the invite. Not persisted. */
  inviteRequested: boolean;
  accessLevel: 'free' | 'full';
  /** True once this launch's store check finished (or failed). Not persisted. */
  accessResolved: boolean;
  storeAccess: boolean;
  complimentaryAccess: boolean;
  hapticsEnabled: boolean;
  todayActionCoachmarkSeen: boolean;
  /**
   * Marketing email consent chosen on this device: null = never asked/answered.
   * Saved to the account (user metadata) when signed in; see auth/marketing.ts.
   */
  marketingOptIn: boolean | null;
  /** The choice above still needs saving to the account. */
  marketingPending: boolean;
  /** The first-visit walkthrough on Today has been finished or skipped. */
  walkthroughDone: boolean;
  /** Local date Today last played its once-a-day word reveal. */
  lastRevealDate: string | null;
  /** Signed out from Settings: the app shows sign-in until an account signs in. */
  signedOut: boolean;
  /** Simulator-only "Preview Pro" switch for reviewing the paid app. Ignored on real devices. */
  simulatorProPreview: boolean;
  /** Account whose progress (stats, saved words) this device holds; null before any sign-in. */
  progressOwner: string | null;

  completeOnboarding: () => void;
  markFeedScrolled: () => void;
  toggleFavorite: (slug: string) => void;
  /** Idempotent favorite — used by the widget's like action. */
  addFavorite: (slug: string) => void;
  removeFavorite: (slug: string) => void;
  markRead: (slug: string) => void;
  keepSlugs: (slugs: readonly string[], legacyDone?: boolean) => void;
  recordOpen: (localDate: string) => void;
  markRevealed: (localDate: string) => void;
  /** Signing in plays Today's reveal again, even if it already played today. */
  replayReveal: () => void;
  setSignedOut: (signedOut: boolean) => void;
  /**
   * Called on every sign-in. A different account than the one this device's
   * progress belongs to starts fresh (streak, words read, saved, shares);
   * the first account to sign in keeps what was done before signing in.
   */
  claimProgress: (userId: string) => void;
  setSimulatorProPreview: (enabled: boolean) => void;
  /** Returns true if the share was counted (at most once per word per local date). */
  recordShare: (slug: string, localDate: string) => boolean;
  setNotifTime: (time: NotifTime) => void;
  /** All reminder times at once; the earliest becomes the daily word's time. */
  setNotifTimes: (times: readonly NotifTime[]) => void;
  markInviteShown: (moment: InviteMoment, localDate: string) => void;
  dismissInvite: () => void;
  requestInvite: () => void;
  clearInviteRequest: () => void;
  /** Opens Today on this word with the full celebration. */
  celebrate: (slug: string | null) => void;
  clearCelebration: () => void;
  setNotifEnabled: (enabled: boolean) => void;
  setStoreAccess: (active: boolean) => void;
  markAccessResolved: () => void;
  setComplimentaryAccess: (active: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  markTodayActionCoachmarkSeen: () => void;
  completeWalkthrough: () => void;
  setMarketingOptIn: (optedIn: boolean) => void;
  markMarketingSaved: () => void;
}

/** Full access from the store, an account grant, or (simulator only) the Pro preview. */
function accessFor(store: boolean, complimentary: boolean, preview: boolean): 'full' | 'free' {
  return store || complimentary || (preview && isSimulator) ? 'full' : 'free';
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      welcomeDate: null,
      feedScrolled: false,
      favorites: [],
      readSlugs: [],
      keptSlugs: [],
      keptLegacyDone: false,
      sharedCount: 0,
      lastSharedBySlug: {},
      streakState: { lastOpenDate: null, streak: 0 },
      streakBrokeDate: null,
      notifTime: { hour: 11, minute: 11 },
      extraNotifTimes: [],
      notifEnabled: false,
      openDays: [],
      invite: EMPTY_INVITE_STATE,
      celebrateSlug: null,
      celebrateRun: 0,
      inviteRequested: false,
      accessLevel: 'free',
      accessResolved: false,
      storeAccess: false,
      complimentaryAccess: false,
      hapticsEnabled: true,
      todayActionCoachmarkSeen: false,
      walkthroughDone: false,
      lastRevealDate: null,
      signedOut: false,
      simulatorProPreview: false,
      progressOwner: null,
      marketingOptIn: null,
      marketingPending: false,

      completeOnboarding: () =>
        set((s) => ({ onboarded: true, welcomeDate: s.welcomeDate ?? localDateString() })),
      markFeedScrolled: () => set({ feedScrolled: true }),

      toggleFavorite: (slug) =>
        set((s) => ({
          favorites: s.favorites.includes(slug)
            ? s.favorites.filter((f) => f !== slug)
            : [...s.favorites, slug],
        })),

      removeFavorite: (slug) =>
        set((s) => ({ favorites: s.favorites.filter((favorite) => favorite !== slug) })),
      addFavorite: (slug) =>
        set((s) => (s.favorites.includes(slug) ? s : { favorites: [...s.favorites, slug] })),

      markRead: (slug) =>
        set((s) => (s.readSlugs.includes(slug) ? s : { readSlugs: [...s.readSlugs, slug] })),

      keepSlugs: (slugs, legacyDone) =>
        set((s) => {
          const fresh = slugs.filter((slug) => !s.keptSlugs.includes(slug));
          const legacy = legacyDone && !s.keptLegacyDone;
          if (fresh.length === 0 && !legacy) return s;
          return {
            keptSlugs: fresh.length > 0 ? [...s.keptSlugs, ...fresh] : s.keptSlugs,
            ...(legacy ? { keptLegacyDone: true } : {}),
          };
        }),

      recordOpen: (localDate) =>
        set((s) => {
          const prev = s.streakState;
          const broke =
            prev.lastOpenDate !== null &&
            prev.streak >= 1 &&
            daysSinceEpoch(localDate) - daysSinceEpoch(prev.lastOpenDate) > 1;
          const today = daysSinceEpoch(localDate);
          const openDays = s.openDays.includes(localDate)
            ? s.openDays
            : [...s.openDays, localDate].filter((day) => today - daysSinceEpoch(day) < 30);
          const streakState = nextStreak(prev, localDate);
          return {
            streakState,
            invite: streakMoments(streakState.streak).reduce(reachMoment, s.invite),
            openDays,
            ...(broke ? { streakBrokeDate: localDate } : {}),
          };
        }),

      markRevealed: (localDate) => set({ lastRevealDate: localDate }),
      replayReveal: () => set({ lastRevealDate: null }),
      setSignedOut: (signedOut) => set({ signedOut }),
      claimProgress: (userId) => {
        const owner = get().progressOwner;
        if (owner === userId) return;
        if (owner === null) {
          set({ progressOwner: userId });
          return;
        }
        set({
          progressOwner: userId,
          favorites: [],
          readSlugs: [],
          keptSlugs: [],
          sharedCount: 0,
          lastSharedBySlug: {},
          streakState: { lastOpenDate: null, streak: 0 },
          streakBrokeDate: null,
        });
      },

      recordShare: (slug, localDate) => {
        if (get().lastSharedBySlug[slug] === localDate) return false;
        set((s) => ({
          sharedCount: s.sharedCount + 1,
          lastSharedBySlug: { ...s.lastSharedBySlug, [slug]: localDate },
          invite: reachMoment(s.invite, 'first_share'),
        }));
        return true;
      },

      setNotifTime: (notifTime) =>
        set((s) => ({
          notifTime,
          // Picking a time that's already an extra one keeps the list unique.
          extraNotifTimes: s.extraNotifTimes.filter((time) => minutesOf(time) !== minutesOf(notifTime)),
        })),
      setNotifTimes: (times) => {
        const sorted = sortedNotifTimes(times);
        if (sorted.length === 0) return;
        set({ notifTime: sorted[0], extraNotifTimes: sorted.slice(1) });
      },
      markInviteShown: (moment, localDate) => set((s) => ({ invite: markShown(s.invite, moment, localDate) })),
      dismissInvite: () => set((s) => ({ invite: markDismissed(s.invite) })),
      requestInvite: () => set({ inviteRequested: true }),
      clearInviteRequest: () => set({ inviteRequested: false }),
      celebrate: (celebrateSlug) => set((s) => ({ celebrateSlug, celebrateRun: s.celebrateRun + 1 })),
      clearCelebration: () => set({ celebrateSlug: null }),
      setNotifEnabled: (notifEnabled) => set({ notifEnabled }),
      setStoreAccess: (active) => set((s) => ({
        storeAccess: active,
        accessResolved: true,
        accessLevel: accessFor(active, s.complimentaryAccess, s.simulatorProPreview),
      })),
      setComplimentaryAccess: (active) => set((s) => ({
        complimentaryAccess: active,
        accessLevel: accessFor(s.storeAccess, active, s.simulatorProPreview),
      })),
      setSimulatorProPreview: (enabled) => set((s) => ({
        simulatorProPreview: enabled,
        accessLevel: accessFor(s.storeAccess, s.complimentaryAccess, enabled),
      })),
      markAccessResolved: () => set({ accessResolved: true }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      markTodayActionCoachmarkSeen: () => set({ todayActionCoachmarkSeen: true }),
      // The walkthrough's last step covers save/share, so the old single tip is retired with it.
      completeWalkthrough: () => set({ walkthroughDone: true, todayActionCoachmarkSeen: true }),
      setMarketingOptIn: (marketingOptIn) => set({ marketingOptIn, marketingPending: true }),
      markMarketingSaved: () => set({ marketingPending: false }),
    }),
    {
      name: 'emotionary.user.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // An old beta unlock must never become a paid entitlement. Store and account
      // access are checked on every launch and excluded from storage.
      partialize: ({
        accessLevel: _access,
        accessResolved: _resolved,
        storeAccess: _store,
        complimentaryAccess: _complimentary,
        celebrateSlug: _celebrate,
        celebrateRun: _celebrateRun,
        inviteRequested: _inviteRequested,
        ...state
      }) => state,
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<UserState>),
        accessLevel: current.accessLevel,
        accessResolved: current.accessResolved,
        storeAccess: current.storeAccess,
        complimentaryAccess: current.complimentaryAccess,
        celebrateSlug: current.celebrateSlug,
        celebrateRun: current.celebrateRun,
        inviteRequested: current.inviteRequested,
      }),
    },
  ),
);

/**
 * Runs `run` once this launch's access check has finished (straight away if it
 * already has). Returns a function that cancels the wait.
 */
export function whenAccessResolved(run: () => void): () => void {
  if (useUserStore.getState().accessResolved) {
    run();
    return () => {};
  }
  const unsubscribe = useUserStore.subscribe((state) => {
    if (!state.accessResolved) return;
    unsubscribe();
    run();
  });
  return unsubscribe;
}
