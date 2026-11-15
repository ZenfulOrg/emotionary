import { useContentStore } from '@/content/store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

function word(slug: string, isFree: boolean) {
  return {
    id: slug,
    slug,
    word: slug,
    pronunciation: '',
    language: 'English',
    type: 'noun',
    level: 1,
    definition: 'd',
    wisdom: 'w',
    is_free: isFree,
    audio_url: null,
    published_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
}

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

describe('content sync', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('retries without free_order when the database lacks that column', async () => {
    const remoteWords = [word('a', true), word('b', false), word('c', false)];
    const urls: string[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('select=updated_at')) {
        return response(200, [{ updated_at: '2026-11-01T00:00:00Z' }], {
          'content-range': '0-0/3',
        });
      }
      if (url.includes('free_order')) return response(400, { code: '42703' });
      return response(200, remoteWords);
    }) as typeof fetch;

    await useContentStore.getState().sync();

    const { words, verified } = useContentStore.getState();
    expect(urls.some((u) => u.includes('free_order'))).toBe(true);
    expect(verified).toBe(true);
    expect(words.map((w) => w.slug)).toEqual(['a', 'b', 'c']);
    expect(words.filter((w) => w.is_free)).toHaveLength(1);
  });
});
