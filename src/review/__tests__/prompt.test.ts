import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { canAskAgain, isReviewMoment, maybeAskForReview } from '@/review/prompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(async () => true),
  requestReview: jest.fn(async () => undefined),
}));

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'ios');
});

test('a streak of three days or more is a good moment', () => {
  expect(isReviewMoment(2)).toBe(false);
  expect(isReviewMoment(3)).toBe(true);
  expect(isReviewMoment(40)).toBe(true);
});

test('asks at most once every four months', () => {
  const now = 1_800_000_000_000;
  expect(canAskAgain(0, now)).toBe(true);
  expect(canAskAgain(now - 30 * DAY, now)).toBe(false);
  expect(canAskAgain(now - 120 * DAY, now)).toBe(true);
});

test('shows the system prompt once, then waits', async () => {
  expect(await maybeAskForReview()).toBe(true);
  expect(await maybeAskForReview()).toBe(false);
  expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
});

test('does nothing when the store prompt is unavailable', async () => {
  (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
  expect(await maybeAskForReview()).toBe(false);
  expect(StoreReview.requestReview).not.toHaveBeenCalled();
});
