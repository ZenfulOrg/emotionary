import { compareVersions, decideUpdatePrompt, type RemoteAppConfig } from '@/app-config/version';

const empty: RemoteAppConfig = {
  ios_latest_version: null,
  ios_min_version: null,
  android_latest_version: null,
  android_min_version: null,
  update_message: null,
};

describe('compareVersions', () => {
  test('orders numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.7', '1.7.0')).toBe(0);
    expect(compareVersions('1.7.0', '1.7.1')).toBeLessThan(0);
  });
});

describe('decideUpdatePrompt', () => {
  test('shows nothing without config, version, or on web', () => {
    expect(decideUpdatePrompt('1.7.0', 'ios', null, null)).toEqual({ kind: 'none' });
    expect(decideUpdatePrompt(null, 'ios', empty, null)).toEqual({ kind: 'none' });
    expect(
      decideUpdatePrompt('1.7.0', 'web', { ...empty, ios_min_version: '9.0.0' }, null),
    ).toEqual({ kind: 'none' });
  });

  test('an empty config row changes nothing', () => {
    expect(decideUpdatePrompt('1.7.0', 'ios', empty, null)).toEqual({ kind: 'none' });
  });

  test('offers a newer version, once per version', () => {
    const config = { ...empty, ios_latest_version: '1.8.0', update_message: ' New words! ' };
    expect(decideUpdatePrompt('1.7.1', 'ios', config, null)).toEqual({
      kind: 'available',
      version: '1.8.0',
      message: 'New words!',
    });
    expect(decideUpdatePrompt('1.7.1', 'ios', config, '1.8.0')).toEqual({ kind: 'none' });
    expect(decideUpdatePrompt('1.8.0', 'ios', config, null)).toEqual({ kind: 'none' });
  });

  test('requires an update only below the minimum, and dismissal cannot skip it', () => {
    const config = { ...empty, android_min_version: '1.7.1', android_latest_version: '1.8.0' };
    expect(decideUpdatePrompt('1.7.0', 'android', config, '1.8.0').kind).toBe('required');
    expect(decideUpdatePrompt('1.7.1', 'android', config, null).kind).toBe('available');
  });

  test('keeps platforms separate', () => {
    const config = { ...empty, android_min_version: '9.0.0' };
    expect(decideUpdatePrompt('1.7.1', 'ios', config, null)).toEqual({ kind: 'none' });
  });

  test('ignores malformed versions instead of blocking', () => {
    const config = { ...empty, ios_min_version: 'latest' };
    expect(decideUpdatePrompt('1.7.1', 'ios', config, null)).toEqual({ kind: 'none' });
  });
});
