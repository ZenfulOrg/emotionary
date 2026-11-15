/**
 * Pure update-prompt policy. No I/O here so it is fully unit-tested.
 */

export interface RemoteAppConfig {
  ios_latest_version: string | null;
  ios_min_version: string | null;
  android_latest_version: string | null;
  android_min_version: string | null;
  update_message: string | null;
}

export type UpdatePrompt =
  | { kind: 'none' }
  | { kind: 'available'; version: string; message: string | null }
  | { kind: 'required'; version: string; message: string | null };

/** Compares dotted numeric versions ('1.7' == '1.7.0'). Returns <0, 0 or >0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const VERSION = /^\d+(\.\d+){0,2}$/;

/**
 * Decides what to show. Anything malformed or missing means "show nothing":
 * a bad config row must never block or nag users.
 */
export function decideUpdatePrompt(
  current: string | null | undefined,
  platform: string,
  config: RemoteAppConfig | null,
  dismissedVersion: string | null,
): UpdatePrompt {
  if (!config || !current || !VERSION.test(current)) return { kind: 'none' };
  if (platform !== 'ios' && platform !== 'android') return { kind: 'none' };

  const min = platform === 'ios' ? config.ios_min_version : config.android_min_version;
  const latest = platform === 'ios' ? config.ios_latest_version : config.android_latest_version;
  const message = config.update_message?.trim() || null;

  if (min && VERSION.test(min) && compareVersions(current, min) < 0) {
    return { kind: 'required', version: min, message };
  }
  if (
    latest &&
    VERSION.test(latest) &&
    compareVersions(current, latest) < 0 &&
    dismissedVersion !== latest
  ) {
    return { kind: 'available', version: latest, message };
  }
  return { kind: 'none' };
}
