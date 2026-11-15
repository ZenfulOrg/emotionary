import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isSimulator } from '@/dev/simulator';

import { daysSinceEpoch } from '@/daily/engine';
import { nextStreak, type StreakState } from '@/store/streak';

export interface NotifTime {
  hour: number;
  minute: number;
}

interface UserState {
  onboarded: boolean;
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
  notifTime: NotifTime;
  notifEnabled: boolean;
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

  completeOnboarding: () => void;
  toggleFavorite: (slug: string) => void;
  /** Idempotent favorite — used by the widget's like action. */
  addFavorite: (slug: string) => void;
  removeFavorite: (slug: string) => void;
  markRead: (slug: string) => void;
  keepSlugs: (slugs: readonly string[], legacyDone?: boolean) => void;
  recordOpen: (localDate: string) => void;
  markRevealed: (localDate: string) => void;
  setSignedOut: (signedOut: boolean) => void;
  setSimulatorProPreview: (enabled: boolean) => void;
  /** Returns true if the share was counted (at most once per word per local date). */
  recordShare: (slug: string, localDate: string) => boolean;
  setNotifTime: (time: NotifTime) => void;
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
      favorites: [],
      readSlugs: [],
      keptSlugs: [],
      keptLegacyDone: false,
      sharedCount: 0,
      lastSharedBySlug: {},
      streakState: { lastOpenDate: null, streak: 0 },
      streakBrokeDate: null,
      notifTime: { hour: 11, minute: 11 },
      notifEnabled: false,
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
      marketingOptIn: null,
      marketingPending: false,

      completeOnboarding: () => set({ onboarded: true }),

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
          return {
            streakState: nextStreak(prev, localDate),
            ...(broke ? { streakBrokeDate: localDate } : {}),
          };
        }),

      markRevealed: (localDate) => set({ lastRevealDate: localDate }),
      setSignedOut: (signedOut) => set({ signedOut }),

      recordShare: (slug, localDate) => {
        if (get().lastSharedBySlug[slug] === localDate) return false;
        set((s) => ({
          sharedCount: s.sharedCount + 1,
          lastSharedBySlug: { ...s.lastSharedBySlug, [slug]: localDate },
        }));
        return true;
      },

      setNotifTime: (notifTime) => set({ notifTime }),
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
        ...state
      }) => state,
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<UserState>),
        accessLevel: current.accessLevel,
        accessResolved: current.accessResolved,
        storeAccess: current.storeAccess,
        complimentaryAccess: current.complimentaryAccess,
      }),
    },
  ),
);
