import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  sharedCount: number;
  lastSharedBySlug: Record<string, string>; // slug -> last local date shared
  streakState: StreakState;
  /** Local date on which a running streak was last broken (for the wilt visual). */
  streakBrokeDate: string | null;
  notifTime: NotifTime;
  notifEnabled: boolean;
  accessLevel: 'free' | 'full';
  hapticsEnabled: boolean;
  todayActionCoachmarkSeen: boolean;

  completeOnboarding: () => void;
  toggleFavorite: (slug: string) => void;
  /** Idempotent favorite — used by the widget's like action. */
  addFavorite: (slug: string) => void;
  markRead: (slug: string) => void;
  recordOpen: (localDate: string) => void;
  /** Returns true if the share was counted (at most once per word per local date). */
  recordShare: (slug: string, localDate: string) => boolean;
  setNotifTime: (time: NotifTime) => void;
  setNotifEnabled: (enabled: boolean) => void;
  setStoreAccess: (active: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  markTodayActionCoachmarkSeen: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      favorites: [],
      readSlugs: [],
      sharedCount: 0,
      lastSharedBySlug: {},
      streakState: { lastOpenDate: null, streak: 0 },
      streakBrokeDate: null,
      notifTime: { hour: 11, minute: 11 },
      notifEnabled: false,
      accessLevel: 'free',
      hapticsEnabled: true,
      todayActionCoachmarkSeen: false,

      completeOnboarding: () => set({ onboarded: true }),

      toggleFavorite: (slug) =>
        set((s) => ({
          favorites: s.favorites.includes(slug)
            ? s.favorites.filter((f) => f !== slug)
            : [...s.favorites, slug],
        })),

      addFavorite: (slug) =>
        set((s) => (s.favorites.includes(slug) ? s : { favorites: [...s.favorites, slug] })),

      markRead: (slug) =>
        set((s) => (s.readSlugs.includes(slug) ? s : { readSlugs: [...s.readSlugs, slug] })),

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
      setStoreAccess: (active) => set({ accessLevel: active ? 'full' : 'free' }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      markTodayActionCoachmarkSeen: () => set({ todayActionCoachmarkSeen: true }),
    }),
    {
      name: 'emotionary.user.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // An old beta unlock must never become a paid entitlement. StoreKit is
      // checked on every launch; access is deliberately excluded from storage.
      partialize: ({ accessLevel: _access, ...state }) => state,
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<UserState>),
        accessLevel: current.accessLevel,
      }),
    },
  ),
);
