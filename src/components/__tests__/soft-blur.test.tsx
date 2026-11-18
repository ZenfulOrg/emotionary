import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SoftBlur } from '@/components/SoftBlur';

let tree: ReactTestRenderer;
afterEach(() => act(() => tree.unmount()));

function setPlatform(os: 'ios' | 'android', version: number | string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  Object.defineProperty(Platform, 'Version', { configurable: true, get: () => version });
}

/**
 * 1.8.0 beta: on Android expo-blur draws only a see-through tint unless it is
 * given a blur target and a blur method, so locked text showed through.
 */
test('Android 12+ blurs the content for real, via a blur target', () => {
  setPlatform('android', 34);
  act(() => {
    tree = create(<SoftBlur intensity={38}><Text>hidden</Text></SoftBlur>);
  });
  const blur = tree.root.findByType(BlurView);
  expect(blur.props.blurMethod).toBe('dimezisBlurViewSdk31Plus');
  expect(blur.props.blurTarget).toBeDefined();
});

test('older Android covers the content with a near-solid wash, never a bare tint', () => {
  setPlatform('android', 29);
  act(() => {
    tree = create(<SoftBlur intensity={38}><Text>hidden</Text></SoftBlur>);
  });
  expect(tree.root.findAllByType(BlurView)).toHaveLength(0);
});

test('iOS keeps its native blur', () => {
  setPlatform('ios', '18.0');
  act(() => {
    tree = create(<SoftBlur intensity={38}><Text>hidden</Text></SoftBlur>);
  });
  expect(tree.root.findAllByType(BlurView)).toHaveLength(1);
});
