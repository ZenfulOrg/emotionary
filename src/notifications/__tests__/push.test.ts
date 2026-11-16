import * as Notifications from 'expo-notifications';

import { cachedPushLive, registerForPush } from '@/notifications/push';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/telemetry/deviceStatus', () => ({ installId: jest.fn(async () => 'install-1') }));
jest.mock('expo-application', () => ({
  getIosPushNotificationServiceEnvironmentAsync: jest.fn(async () => 'development'),
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getDevicePushTokenAsync: jest.fn(async () => ({ type: 'ios', data: 'a'.repeat(64) })),
}));
jest.mock('@/config', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable',
  syncEnabled: true,
}));

const input = {
  enabled: true,
  time: { hour: 11, minute: 11 },
  hasFullAccess: false,
  kept: ['toska'],
  streakState: { lastOpenDate: '2026-11-15', streak: 3 },
};

describe('registerForPush', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sends the token and settings, and remembers that server push is live', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, json: async () => true }) as unknown as Response);
    global.fetch = fetchMock as typeof fetch;

    await expect(registerForPush(input)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/register_push_device');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      p_install_id: 'install-1',
      p_token: 'a'.repeat(64),
      p_apns_environment: 'development',
      p_notify_hour: 11,
      p_notify_minute: 11,
      p_enabled: true,
      p_plan: 'free',
      p_kept_slugs: ['toska'],
      p_streak: 3,
      p_last_open_date: '2026-11-15',
    });
    await expect(cachedPushLive()).resolves.toBe(true);
  });

  it('keeps local notifications (false) while the server is not live', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => false }) as unknown as Response) as typeof fetch;
    await expect(registerForPush(input)).resolves.toBe(false);
  });

  it('falls back to the last known answer when offline', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => true }) as unknown as Response) as typeof fetch;
    await registerForPush(input);
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as typeof fetch;
    await expect(registerForPush(input)).resolves.toBe(true);
  });

  it('does not register without notification permission', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await registerForPush(input);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
