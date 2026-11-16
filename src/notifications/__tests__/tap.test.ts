import { notificationTarget, safeRoute } from '@/notifications/tap';

describe('notificationTarget', () => {
  it('reads local notification data', () => {
    expect(notificationTarget({ data: { url: '/', slug: 'toska' } })).toEqual({ slug: 'toska', url: null });
  });

  it('reads a raw APNs payload under "body"', () => {
    const trigger = { type: 'push', payload: { aps: {}, body: { url: '/paywall' } } };
    expect(notificationTarget({ data: {} }, trigger)).toEqual({ slug: null, url: '/paywall' });
  });

  it('reads top-level APNs payload keys', () => {
    const trigger = { type: 'push', payload: { aps: {}, slug: 'saudade', url: '/unlock/saudade' } };
    expect(notificationTarget({}, trigger)).toEqual({ slug: 'saudade', url: '/unlock/saudade' });
  });

  it('rejects links that leave the app', () => {
    expect(safeRoute('https://evil.example')).toBeNull();
    expect(safeRoute('//evil.example')).toBeNull();
    expect(safeRoute('/word/toska')).toBe('/word/toska');
  });
});
