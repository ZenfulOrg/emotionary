import { notificationBody, streakRescueDate } from '@/notifications/scheduler';

describe('notificationBody (first clause, ≤ ~100 chars)', () => {
  test('cuts at a legacy em-dash clause boundary', () => {
    expect(
      notificationBody(
        'The warmth of the sun on a cold winter’s day — small, specific, and disproportionately comforting.',
      ),
    ).toBe('The warmth of the sun on a cold winter’s day.');
  });

  test('cuts at a normalized semicolon clause boundary', () => {
    expect(
      notificationBody(
        'The warmth of the sun on a cold winter’s day; small, specific, and disproportionately comforting.',
      ),
    ).toBe('The warmth of the sun on a cold winter’s day.');
  });

  test('cuts at a sentence boundary', () => {
    expect(notificationBody('A short sentence. And then more detail follows here.')).toBe(
      'A short sentence.',
    );
  });

  test('truncates very long clauses with an ellipsis', () => {
    const long = 'x'.repeat(140);
    const body = notificationBody(long);
    expect(body.length).toBeLessThanOrEqual(101);
    expect(body.endsWith('…')).toBe(true);
  });

  test('always ends with terminal punctuation', () => {
    expect(notificationBody('An unpunctuated clause')).toBe('An unpunctuated clause.');
  });
});

describe('streak rescue scheduling', () => {
  test('warns at 8 PM on the day after the last qualifying open', () => {
    const rescue = streakRescueDate({ lastOpenDate: '2026-08-24', streak: 7 });
    expect(rescue?.getFullYear()).toBe(2026);
    expect(rescue?.getMonth()).toBe(7);
    expect(rescue?.getDate()).toBe(25);
    expect(rescue?.getHours()).toBe(20);
    expect(rescue?.getMinutes()).toBe(0);
  });

  test('does not schedule a warning without a running streak', () => {
    expect(streakRescueDate({ lastOpenDate: null, streak: 0 })).toBeNull();
  });
});
