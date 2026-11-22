import { MAX_NOTIF_TIMES, sortedNotifTimes } from '@/store/userStore';

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
