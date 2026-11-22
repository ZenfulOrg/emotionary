import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { track } from '@/analytics/track';

/**
 * Asks for an App Store / Google Play rating at a happy moment: a streak of
 * a few days, or right after sharing a card. Uses the system's own prompt
 * (SKStoreReviewController / Play In-App Review), which the OS may choose not
 * to show; we ask at most once every few months so it never nags.
 */

const LAST_ASKED_KEY = 'emotionary.review.lastAsked.v1';
const MIN_GAP_MS = 120 * 24 * 60 * 60 * 1000;
export const REVIEW_STREAK = 3;

type StoreReviewModule = typeof import('expo-store-review');

/**
 * Loaded on first use, so a build missing the native module can never crash
 * the screen that imports this file; the prompt is simply skipped.
 */
function loadStoreReview(): StoreReviewModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose
    return require('expo-store-review') as StoreReviewModule;
  } catch {
    return null;
  }
}

export function isReviewMoment(streak: number): boolean {
  return streak >= REVIEW_STREAK;
}

export function canAskAgain(lastAskedMs: number, now: number = Date.now()): boolean {
  return !Number.isFinite(lastAskedMs) || lastAskedMs <= 0 || now - lastAskedMs >= MIN_GAP_MS;
}

/** Shows the rating prompt if it's been long enough. Never throws. */
export async function maybeAskForReview(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  try {
    const last = Number((await AsyncStorage.getItem(LAST_ASKED_KEY)) ?? 0);
    if (!canAskAgain(last)) return false;
    const StoreReview = loadStoreReview();
    if (!StoreReview || !(await StoreReview.isAvailableAsync())) return false;
    await AsyncStorage.setItem(LAST_ASKED_KEY, String(Date.now()));
    await StoreReview.requestReview();
    track('rating_prompt_shown');
    return true;
  } catch {
    return false;
  }
}
