import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';
import type { StreakState } from '@/store/streak';
import type { NotifTime } from '@/store/userStore';
import { installId } from '@/telemetry/deviceStatus';

/**
 * Server push registration. The device hands its push token and delivery
 * settings to Supabase (public.register_push_device); a server job then sends
 * the daily word, the streak reminder, one-off messages and triggered
 * messages, every day, for as long as notifications are on, with no 38-day
 * local queue. Supabase answers whether server push is live: only then does
 * the app stop scheduling notifications itself, so nobody misses a day.
 */

const LIVE_KEY = 'emotionary.push.live.v1';

export type PushRegistration = {
  enabled: boolean;
  time: NotifTime;
  hasFullAccess: boolean;
  kept: readonly string[];
  streakState: StreakState;
};

/** The device's raw APNs (iOS) or FCM (Android) token, or null. */
async function deviceToken(): Promise<string | null> {
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' && token.data.length >= 32 ? token.data : null;
  } catch {
    return null;
  }
}

async function apnsEnvironment(): Promise<'development' | 'production' | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const env = await Application.getIosPushNotificationServiceEnvironmentAsync();
    return env === 'development' ? 'development' : 'production';
  } catch {
    return 'production';
  }
}

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Last known answer from the server, so an offline launch keeps behaving the same. */
export async function cachedPushLive(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LIVE_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Registers (or updates) this install for server push. Returns whether the
 * server is sending notifications, falling back to the last known answer
 * when the device is offline. Never throws.
 */
export async function registerForPush(input: PushRegistration): Promise<boolean> {
  if (!syncEnabled || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return false;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return cachedPushLive();
    const token = await deviceToken();
    if (!token) return cachedPushLive();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_push_device`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_install_id: await installId(),
        p_platform: Platform.OS,
        p_token: token,
        p_apns_environment: await apnsEnvironment(),
        p_timezone: timeZone(),
        p_notify_hour: input.time.hour,
        p_notify_minute: input.time.minute,
        p_enabled: input.enabled,
        p_plan: input.hasFullAccess ? 'paid' : 'free',
        p_kept_slugs: [...input.kept],
        p_streak: input.streakState.streak,
        p_last_open_date: input.streakState.lastOpenDate,
        p_app_version: Constants.expoConfig?.version ?? null,
      }),
    });
    if (!res.ok) return cachedPushLive();
    const live = (await res.json()) === true;
    await AsyncStorage.setItem(LIVE_KEY, live ? '1' : '0').catch(() => {});
    return live;
  } catch {
    return cachedPushLive();
  }
}
