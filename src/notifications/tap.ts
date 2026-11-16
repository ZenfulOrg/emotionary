/**
 * What a tapped notification asks for, from either source:
 * - local notifications put it in content.data
 * - server pushes (raw APNs) carry it in the payload, under "body" (the key
 *   expo-notifications reads as data) and at the top level.
 */
export interface NotificationTarget {
  slug: string | null;
  /** In-app route such as '/paywall' or '/word/toska'; null = Today. */
  url: string | null;
}

type Bag = Record<string, unknown>;

function asBag(value: unknown): Bag | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Bag) : null;
}

/** Only plain in-app routes: one leading slash, no scheme or host. */
export function safeRoute(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\/(?!\/)[A-Za-z0-9/_?=&.-]*$/.test(value) ? value : null;
}

export function notificationTarget(content: { data?: unknown }, trigger?: unknown): NotificationTarget {
  const payload = asBag(asBag(trigger)?.payload);
  const sources = [asBag(content.data), asBag(payload?.body), payload].filter((b): b is Bag => b !== null);
  const pick = (key: string) => sources.map((s) => s[key]).find((v) => typeof v === 'string');
  const slug = pick('slug');
  const url = safeRoute(pick('url'));
  return { slug: typeof slug === 'string' && slug.length > 0 ? slug : null, url: url === '/' ? null : url };
}
