import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';
import { daysSinceEpoch, localDateString } from '@/daily/engine';
import { useUserStore } from '@/store/userStore';
import { installId } from '@/telemetry/deviceStatus';

/**
 * Anonymous product events (public.events), see docs/analytics-plan.md.
 *
 * Keyed by the random install id shared with device status and push; never
 * an account, email or what someone typed. Events wait in memory and go out
 * in small batches (every 15 seconds, at 20 events, or when the app goes to
 * the background). Failures are silent: a lost batch only makes counts low.
 */
export type EventName =
  | 'app_opened'
  | 'onboarding_step_viewed'
  | 'onboarding_completed'
  | 'notification_permission_answered'
  | 'reminder_times_changed'
  | 'word_viewed'
  | 'word_saved'
  | 'word_unsaved'
  | 'word_shared'
  | 'pronunciation_played'
  | 'origin_opened'
  | 'search_performed'
  | 'notification_opened'
  | 'widget_tapped'
  | 'streak_milestone'
  | 'paywall_shown'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'rating_prompt_shown'
  | 'account_created'
  | 'signed_in'
  | 'signed_out';

type Props = Record<string, string | number | boolean | null>;
type Queued = { event: EventName; props: Props; at: string };

const FLUSH_MS = 15_000;
const BATCH_MAX = 20;
const QUEUE_MAX = 200;

let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let listening = false;

const enabled = () => syncEnabled && (Platform.OS === 'ios' || Platform.OS === 'android');

/** Plan, streak and days since install go with every event. */
function commonProps(): Props {
  const user = useUserStore.getState();
  const today = localDateString();
  return {
    plan: user.accessLevel === 'full' ? 'paid' : 'free',
    streak: user.streakState.streak,
    days_since_install: user.welcomeDate ? daysSinceEpoch(today) - daysSinceEpoch(user.welcomeDate) : null,
  };
}

export function track(event: EventName, props: Props = {}): void {
  if (!enabled()) return;
  if (!listening) {
    listening = true;
    AppState.addEventListener('change', (state) => {
      if (state === 'background') void flush();
    });
  }
  queue.push({ event, props: { ...commonProps(), ...props }, at: new Date().toISOString() });
  if (queue.length > QUEUE_MAX) queue = queue.slice(-QUEUE_MAX);
  if (queue.length >= BATCH_MAX) void flush();
  else if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS);
}

export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, BATCH_MAX);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/report_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_install_id: await installId(),
        p_platform: Platform.OS,
        p_app_version: Constants.expoConfig?.version ?? null,
        p_events: batch,
      }),
    });
    // Server trouble: keep the batch for the next try (offline throws below).
    if (!res.ok && res.status >= 500) queue.unshift(...batch);
  } catch {
    queue.unshift(...batch);
  } finally {
    flushing = false;
    if (queue.length > 0 && !timer) timer = setTimeout(() => void flush(), FLUSH_MS);
  }
}

/** Where the paywall was last opened from, for the purchase events. */
let paywallPlacement = 'unknown';
export function setPaywallPlacement(placement: string): void {
  paywallPlacement = placement;
}
export function currentPaywallPlacement(): string {
  return paywallPlacement;
}

/** Streak lengths worth an event. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;
