import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { Grain, Screen } from '@/components/brand/Surfaces';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/components/brand/Rule', () => ({ Rule: () => null }));
jest.mock('@/components/brand/Controls', () => ({ IconButton: () => null }));
jest.mock('@/components/brand/Typography', () => ({ Eyebrow: () => null, Headline: () => null }));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: RNView };
});

let tree: ReactTestRenderer;
afterEach(() => act(() => tree.unmount()));

/**
 * Android 1.7.0 regression: the grain texture is laid over every screen. Its
 * `pointerEvents: 'none'` lived only in the Image's style, which Android's
 * image view ignores, so the texture swallowed every tap and nobody could get
 * past "Begin". Touch-through must come from a View's `pointerEvents` prop.
 */
test('the grain overlay lets every tap through on Android', () => {
  act(() => {
    tree = create(<Grain />);
  });
  const overlay = tree.root.findByProps({ testID: 'grain' });
  expect(overlay.type).toBe(View);
  expect(overlay.props.pointerEvents).toBe('none');
  // The image sits inside the untouchable view, never as the outermost layer.
  expect(overlay.findByType(Image)).toBeTruthy();
  expect(tree.root.findAllByType(Image)).toHaveLength(1);
});

test('every Screen ends with an untouchable grain, not a bare image', () => {
  act(() => {
    tree = create(
      <Screen>
        <View testID="content" />
      </Screen>,
    );
  });
  const overlay = tree.root.findByProps({ testID: 'grain' });
  expect(overlay.props.pointerEvents).toBe('none');
  const image = overlay.findByType(Image);
  // A style-only pointerEvents on the image is what broke Android; keep it off.
  expect(StyleSheet.flatten(image.props.style).pointerEvents).toBeUndefined();
});
