import React from 'react';
import { act, create } from 'react-test-renderer';
import { router, useLocalSearchParams } from 'expo-router';

import WidgetActionScreen from '@/app/widget/[action]/[slug]';
import { useContentStore } from '@/content/store';
import { useUserStore } from '@/store/userStore';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: jest.fn() }));
jest.mock('@/feedback/haptics', () => ({ successHaptic: jest.fn() }));
jest.mock('@/content/store', () => ({ useContentStore: { getState: jest.fn() } }));

async function openWidget(action: string, slug = 'meraki') {
  jest.mocked(useLocalSearchParams).mockReturnValue({ action, slug });
  let screen: ReturnType<typeof create>;
  await act(async () => { screen = create(<WidgetActionScreen />); });
  act(() => screen.unmount());
}

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ favorites: [] });
  jest.mocked(useContentStore.getState).mockReturnValue({ words: [{ slug: 'meraki' }] } as ReturnType<typeof useContentStore.getState>);
});

it('saves before navigation and tolerates a repeated save URL', async () => {
  jest.mocked(router.replace).mockImplementation(() => {
    expect(useUserStore.getState().favorites).toContain('meraki');
  });
  await openWidget('like');
  await openWidget('like');
  expect(useUserStore.getState().favorites).toEqual(['meraki']);
  expect(router.replace).toHaveBeenLastCalledWith('/word/meraki');
});

it('removes a saved word without toggling it back on repeated delivery', async () => {
  useUserStore.setState({ favorites: ['meraki', 'apricity'] });
  jest.mocked(router.replace).mockImplementation(() => {});
  await openWidget('unlike');
  await openWidget('unlike');
  expect(useUserStore.getState().favorites).toEqual(['apricity']);
});

it('opens the correct share card without changing favorites', async () => {
  jest.mocked(router.replace).mockImplementation(() => {});
  await openWidget('share');
  expect(router.replace).toHaveBeenCalledWith('/share/meraki');
  expect(useUserStore.getState().favorites).toEqual([]);
});

it('does not save an unavailable word', async () => {
  jest.mocked(router.replace).mockImplementation(() => {});
  await openWidget('like', 'missing');
  expect(router.replace).toHaveBeenCalledWith('/');
  expect(useUserStore.getState().favorites).toEqual([]);
});
