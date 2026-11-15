import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';
import Widgets from '../../modules/emotionary-widgets/src/EmotionaryWidgetsModule';

/**
 * Anonymous adoption stats (public.device_status): is the daily notification
 * on, is a widget placed, free or paid. Keyed by a random install id that is
 * never linked to an account. Sent at most once a day unless something
 * changed; every failure is silent and retried on the next foreground.
 */

const INSTALL_ID_KEY = 'emotionary.installId.v1';
const LAST_SENT_KEY = 'emotionary.deviceStatus.lastSent.v1';
const DAY_MS = 86_400_000;

export interface DeviceStatus {
  platform: 'ios' | 'android';
  appVersion: string | null;
  plan: 'free' | 'paid';
  notificationPermission: 'granted' | 'denied' | 'undetermined';
  remindersEnabled: boolean;
  /** -1 when unknown */
  widgetCount: number;
}

/** RFC 4122 v4 shape from Math.random; anonymity, not security, is the goal. */
export function randomInstallId(random: () => number = Math.random): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Send when the status changed, or a day has passed (keeps last_seen fresh). */
export function shouldSend(
  status: DeviceStatus,
  last: { status: DeviceStatus; at: number } | null,
  now: number,
): boolean {
  if (!last) return true;
  if (now - last.at >= DAY_MS) return true;
  return JSON.stringify(status) !== JSON.stringify(last.status);
}

async function installId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;
  const id = randomInstallId();
  await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  return id;
}

async function widgetCount(): Promise<number> {
  try {
    const count = await Widgets?.installedWidgetCount?.();
    return typeof count === 'number' && Number.isFinite(count) ? count : -1;
  } catch {
    return -1;
  }
}

async function collect(plan: 'free' | 'paid', remindersEnabled: boolean): Promise<DeviceStatus | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const permission = await Notifications.getPermissionsAsync();
  return {
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? null,
    plan,
    notificationPermission: permission.granted
      ? 'granted'
      : permission.canAskAgain
        ? 'undetermined'
        : 'denied',
    remindersEnabled,
    widgetCount: await widgetCount(),
  };
}

let inFlight = false;

export async function reportDeviceStatus(input: {
  plan: 'free' | 'paid';
  remindersEnabled: boolean;
}): Promise<void> {
  if (!syncEnabled || inFlight) return;
  inFlight = true;
  try {
    const status = await collect(input.plan, input.remindersEnabled);
    if (!status) return;
    const raw = await AsyncStorage.getItem(LAST_SENT_KEY);
    const last = raw ? (JSON.parse(raw) as { status: DeviceStatus; at: number }) : null;
    const now = Date.now();
    if (!shouldSend(status, last, now)) return;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/report_device_status`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_install_id: await installId(),
        p_platform: status.platform,
        p_app_version: status.appVersion,
        p_plan: status.plan,
        p_notification_permission: status.notificationPermission,
        p_reminders_enabled: status.remindersEnabled,
        p_widget_count: status.widgetCount,
      }),
    });
    if (res.ok) await AsyncStorage.setItem(LAST_SENT_KEY, JSON.stringify({ status, at: now }));
  } catch {
    // offline or transient: try again next foreground
  } finally {
    inFlight = false;
  }
}
