import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Word } from '@/content/types';
import { addDays, daysSinceEpoch, localDateString, monthKey, wordOfDay } from '@/daily/engine';
import { WELCOME_DAYS, welcomeWords } from '@/daily/welcome';
import { canBrowseWord } from '@/entitlements';
import { dailyNotificationContent, reminderNotificationContent } from '@/notifications/content';
import { registerForPush } from '@/notifications/push';
import type { StreakState } from '@/store/streak';
import { sortedNotifTimes, type NotifTime } from '@/store/userStore';
import { track } from '@/analytics/track';

export { dailyNotificationContent, notificationBody } from '@/notifications/content';

/**
 * Notification queue — DESIGN.md §8.
 * Pre-scheduled individual DATE triggers (repeating triggers can't carry
 * per-day words; iOS keeps only the 64 soonest). Worded content only through
 * the end of the current month (its permutation is frozen against publishes),
 * then generic sentinels filling to 38 slots. Rebuilt from scratch on every
 * foreground / settings change — one code path self-heals everything.
 */

// Android fixes a channel's sound and importance when it's created, so each
// change needs a new channel id; old ones are deleted so Settings doesn't show
// duplicates. High importance shows the word as a banner (heads-up), like iOS;
// the default level only chimed and waited in the shade. The push server sends
// to this same id (supabase/functions/send-notifications).
export const CHANNEL_ID = 'daily-word-banner';
const LEGACY_CHANNEL_IDS = ['daily-word', 'daily-word-chime'] as const;
/** Bundled via the expo-notifications config plugin (app.json). */
export const NOTIFICATION_SOUND = 'emotionary_chime.wav';
const MAX_SLOTS = 38;
const STREAK_RESCUE_TIME: NotifTime = { hour: 20, minute: 0 };

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const id of LEGACY_CHANNEL_IDS) {
    await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily word',
    importance: Notifications.AndroidImportance.HIGH,
    sound: NOTIFICATION_SOUND,
    // No exact-alarm permissions by design — delivery is "around" the chosen
    // time (Android 14+ denies SCHEDULE_EXACT_ALARM to this app category).
  });
}

export async function getPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

/** Contextual ask (onboarding / settings). Full permission, not provisional. */
export async function requestPermission(where: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  track('notification_permission_answered', { granted: res.granted, where });
  return res.granted;
}

function fireDate(localDate: string, time: NotifTime): Date {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(y, m - 1, d, time.hour, time.minute, 0, 0);
}

interface RebuildArgs {
  words: readonly Word[];
  /** The daily word's time. */
  time: NotifTime;
  /** Later reminders of the same word, the same day. */
  extraTimes?: readonly NotifTime[];
  enabled: boolean;
  streakState: StreakState;
  hasFullAccess: boolean;
  /** Words this free user keeps (read or saved while free). */
  kept: readonly string[];
  /** Local date onboarding finished; the first two weeks use welcome words. */
  welcomeDate?: string | null;
}

export function streakRescueDate(streakState: StreakState): Date | null {
  if (!streakState.lastOpenDate || streakState.streak < 1) return null;
  return fireDate(addDays(streakState.lastOpenDate, 1), STREAK_RESCUE_TIME);
}

async function doRebuild({
  words,
  time,
  extraTimes = [],
  enabled,
  streakState,
  hasFullAccess,
  kept,
  welcomeDate = null,
}: RebuildArgs): Promise<void> {
  const keptSet = new Set(kept);
  if (Platform.OS === 'web') return;
  const granted = await getPermissionGranted();
  // Hand the token and settings to the server; once server push is live the
  // server sends everything and the device keeps no local queue (no limit on
  // days, and admin one-offs/triggers work without an app update).
  const times = sortedNotifTimes([time, ...extraTimes]);
  const serverPush = await registerForPush({
    enabled,
    time: times[0],
    extraTimes: times.slice(1),
    hasFullAccess,
    kept,
    streakState,
    welcomeDate,
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();

  // Server pushes name the "Daily word" channel too, so it must exist (with
  // the chime) whether the app or the server sends the notifications.
  await ensureChannel();

  if (serverPush || !enabled || !granted || words.length === 0) return;

  const rescueDate = streakRescueDate(streakState);
  if (rescueDate && rescueDate.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Last chance!',
        body: 'If you skip today, your learning streak will be gone. Open the app to keep your streak!',
        data: { url: '/', reason: 'streak-rescue' },
        sound: NOTIFICATION_SOUND,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: rescueDate,
        channelId: CHANNEL_ID,
      },
    });
  }

  const today = localDateString(now);
  // Start-day rule (DESIGN.md §8): times already past today are skipped —
  // never a past-dated trigger that fires instantly as a duplicate right after
  // a notification tap. Today's later reminders still go out.
  const startOffset = 0;
  // iOS keeps only the 64 soonest: more times a day means fewer days queued
  // (the queue is rebuilt on every open, so it never runs dry for an active user).
  const days = Math.max(1, Math.floor(MAX_SLOTS / times.length));

  const cache = new Map<string, Word[]>();
  const welcome = welcomeWords(words);
  const welcomeStart = welcomeDate === null ? null : daysSinceEpoch(welcomeDate);
  for (let i = 0; i < days; i++) {
    const date = addDays(today, startOffset + i);
    const worded = monthKey(date) === monthKey(today);
    const welcomeDay = welcomeStart === null ? -1 : daysSinceEpoch(date) - welcomeStart;
    const curated = welcomeDay >= 0 && welcomeDay < WELCOME_DAYS ? welcome[welcomeDay] : undefined;
    const word = worded ? (curated ?? wordOfDay(words, date, cache)) : null;
    const unlocked = word ? canBrowseWord(word, hasFullAccess, keptSet) : false;
    for (const [slot, slotTime] of times.entries()) {
      const at = fireDate(date, slotTime);
      if (at.getTime() <= now.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          ...(word
            ? slot === 0
              ? dailyNotificationContent(word, date, unlocked)
              : reminderNotificationContent(word, date, unlocked)
            : {
                title: 'Your word of the day is waiting ✳',
                body: 'Open Emotionary to reveal it.',
                data: { url: '/' },
              }),
          sound: NOTIFICATION_SOUND,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: CHANNEL_ID,
        },
      });
    }
  }
}

let inFlight: Promise<void> | null = null;
let pending: RebuildArgs | null = null;

/**
 * Single-flight rebuild (DESIGN.md §8): concurrent calls (foreground handler,
 * notification tap, settings change) collapse into one execution; the latest
 * args win via one trailing re-run.
 */
export function rebuildQueue(args: RebuildArgs): Promise<void> {
  if (inFlight) {
    pending = args;
    return inFlight;
  }
  inFlight = doRebuild(args)
    .catch(() => {
      // scheduling is best-effort; next foreground retries
    })
    .finally(() => {
      inFlight = null;
      if (pending) {
        const next = pending;
        pending = null;
        void rebuildQueue(next);
      }
    });
  return inFlight;
}
