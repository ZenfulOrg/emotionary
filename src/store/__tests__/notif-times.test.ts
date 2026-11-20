import { inviteEligible, MAX_NOTIF_TIMES, sortedNotifTimes } from '@/store/userStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('sortedNotifTimes', () => {
  it('sorts earliest first and drops repeats', () => {
    expect(
      sortedNotifTimes([
        { hour: 18, minute: 0 },
        { hour: 9, minute: 30 },
        { hour: 18, minute: 0 },
      ]),
    ).toEqual([
      { hour: 9, minute: 30 },
      { hour: 18, minute: 0 },
    ]);
  });

  it('keeps at most four times a day', () => {
    const times = Array.from({ length: 6 }, (_, hour) => ({ hour: hour + 6, minute: 0 }));
    expect(sortedNotifTimes(times)).toHaveLength(MAX_NOTIF_TIMES);
  });
});

describe('inviteEligible', () => {
  const days = (count: number, from = '2026-11-20') => {
    const [y, m, d] = from.split('-').map(Number);
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(y, m - 1, d - i);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
  };

  it('needs ten open days in the last two weeks', () => {
    expect(inviteEligible(days(9), '2026-11-20')).toBe(false);
    expect(inviteEligible(days(10), '2026-11-20')).toBe(true);
  });

  it('ignores days older than two weeks', () => {
    expect(inviteEligible(days(10, '2026-10-20'), '2026-11-20')).toBe(false);
  });
});
