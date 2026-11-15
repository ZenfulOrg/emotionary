import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Word } from '@/content/types';
import { addDays, daysSinceEpoch, localDateString, monthKey, wordOfDay } from '@/daily/engine';
import { canBrowseWord } from '@/entitlements';
import type { NotifTime } from '@/store/userStore';
import type { StreakState } from '@/store/streak';

/**
 * Notification queue — DESIGN.md §8.
 * Pre-scheduled individual DATE triggers (repeating triggers can't carry
 * per-day words; iOS keeps only the 64 soonest). Worded content only through
 * the end of the current month (its permutation is frozen against publishes),
 * then generic sentinels filling to 38 slots. Rebuilt from scratch on every
 * foreground / settings change — one code path self-heals everything.
 */

// Android fixes a channel's sound when it's created, so the chime needs a new
// channel id; the old one is deleted so Settings doesn't show two.
export const CHANNEL_ID = 'daily-word-chime';
const LEGACY_CHANNEL_IDS = ['daily-word'] as const;
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
    importance: Notifications.AndroidImportance.DEFAULT,
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
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** First clause of the definition, ≤ ~100 chars, for the notification body. */
export function notificationBody(definition: string): string {
  const clause = definition.split(/\s+[—–]\s+|;\s+|\. /)[0].trim();
  const body = clause.length > 100 ? `${clause.slice(0, 97)}…` : clause;
  return body.endsWith('.') || body.endsWith('…') ? body : `${body}.`;
}

function fireDate(localDate: string, time: NotifTime): Date {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(y, m - 1, d, time.hour, time.minute, 0, 0);
}

interface RebuildArgs {
  words: readonly Word[];
  time: NotifTime;
  enabled: boolean;
  streakState: StreakState;
  hasFullAccess: boolean;
  /** Words this free user keeps (read or saved while free). */
  kept: readonly string[];
}

/** Teaser lines for a paid daily word on the free plan, rotated by date. */
const TEASERS = [
  'Tap to discover what it means.',
  'A feeling you know, finally named. Tap to see it.',
  'Do you know what it means? Tap to find out.',
  "Today's word is waiting to be understood.",
] as const;

/**
 * The daily notification. Everyone gets today's word; when the word is paid
 * and the user is on the free plan, the meaning stays inside the app (the
 * tap opens the unlock page) and the body is a teaser instead.
 */
export function dailyNotificationContent(
  word: Word,
  localDate: string,
  unlocked: boolean,
): { title: string; body: string; data: Record<string, string> } {
  if (unlocked) {
    return {
      title: `Today's word: ${word.word}`,
      body: notificationBody(word.definition),
      data: { url: '/', slug: word.slug },
    };
  }
  return {
    title: `Today's word: ${word.word}`,
    body: TEASERS[daysSinceEpoch(localDate) % TEASERS.length],
    data: { url: `/unlock/${word.slug}`, slug: word.slug, teaser: '1' },
  };
}

export function streakRescueDate(streakState: StreakState): Date | null {
  if (!streakState.lastOpenDate || streakState.streak < 1) return null;
  return fireDate(addDays(streakState.lastOpenDate, 1), STREAK_RESCUE_TIME);
}

async function doRebuild({
  words,
  time,
  enabled,
  streakState,
  hasFullAccess,
  kept,
}: RebuildArgs): Promise<void> {
  const keptSet = new Set(kept);
  if (Platform.OS === 'web') return;
  const granted = await getPermissionGranted();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || !granted || words.length === 0) return;

  await ensureChannel();

  const now = new Date();
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
  // Start-day rule (DESIGN.md §8): if today's delivery time has already
  // passed, start tomorrow — never create a past-dated trigger that fires
  // instantly as a duplicate right after a notification tap.
  const startOffset = fireDate(today, time).getTime() > now.getTime() ? 0 : 1;

  const cache = new Map<string, Word[]>();
  for (let i = 0; i < MAX_SLOTS; i++) {
    const date = addDays(today, startOffset + i);
    const worded = monthKey(date) === monthKey(today);
    const word = worded ? wordOfDay(words, date, cache) : null;
    await Notifications.scheduleNotificationAsync({
      content: {
        ...(word
          ? dailyNotificationContent(word, date, canBrowseWord(word, hasFullAccess, keptSet))
          : {
              title: 'Your word of the day is waiting ✳',
              body: 'Open Emotionary to reveal it.',
              data: { url: '/' },
            }),
        sound: NOTIFICATION_SOUND,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate(date, time),
        channelId: CHANNEL_ID,
      },
    });
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
