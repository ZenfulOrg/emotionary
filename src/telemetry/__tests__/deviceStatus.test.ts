import { randomInstallId, shouldSend, type DeviceStatus } from '@/telemetry/deviceStatus';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.7.1' } }));
jest.mock('../../../modules/emotionary-widgets/src/EmotionaryWidgetsModule', () => null);

const status: DeviceStatus = {
  platform: 'ios',
  appVersion: '1.7.1',
  plan: 'free',
  notificationPermission: 'granted',
  remindersEnabled: true,
  widgetCount: 1,
};

describe('randomInstallId', () => {
  test('is a v4 UUID', () => {
    expect(randomInstallId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('shouldSend', () => {
  const now = 1_000_000_000_000;

  test('sends the first time', () => {
    expect(shouldSend(status, null, now)).toBe(true);
  });

  test('skips an unchanged status within a day', () => {
    expect(shouldSend(status, { status, at: now - 60_000 }, now)).toBe(false);
  });

  test('sends again when something changed', () => {
    expect(shouldSend({ ...status, widgetCount: 0 }, { status, at: now - 60_000 }, now)).toBe(true);
    expect(shouldSend({ ...status, plan: 'paid' }, { status, at: now - 60_000 }, now)).toBe(true);
  });

  test('sends again after a day', () => {
    expect(shouldSend(status, { status, at: now - 86_400_000 }, now)).toBe(true);
  });
});
