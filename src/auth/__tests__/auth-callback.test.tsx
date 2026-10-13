import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import AuthCallbackScreen from '@/app/auth-callback';
import { completeAuthCallback } from '@/auth/client';

jest.mock('expo-linking', () => ({ useURL: jest.fn(), getInitialURL: jest.fn() }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/auth/client', () => ({ completeAuthCallback: jest.fn() }));
jest.mock('@/components/brand', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Body: Text, Eyebrow: Text, Headline: Text, Screen: View,
    Wordmark: () => null, OrbitBackdrop: () => null,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => React.createElement(Text, { onPress }, label),
  };
});

describe('confirmation-link result', () => {
  let renderer: ReactTestRenderer;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(Linking.useURL).mockReturnValue('emotionary://auth-callback#access_token=example');
  });
  afterEach(() => { if (renderer) act(() => renderer.unmount()); });
  const texts = () => renderer.root.findAllByType(Text).map((node) => node.props.children);

  it('shows a retry state, never a success heading, after a failed link', async () => {
    jest.mocked(completeAuthCallback).mockRejectedValue(new Error('This link has expired.'));
    await act(async () => { renderer = create(<AuthCallbackScreen />); });
    expect(texts()).toContain('Let’s try again.');
    expect(texts()).toContain('This link has expired.');
    expect(texts()).not.toContain('You’re all set.');
    act(() => renderer.root.findAllByType(Text).find((node) => node.props.children === 'Return to sign in')!.props.onPress());
    expect(router.replace).toHaveBeenCalledWith('/account');
  });

  it('resets an earlier success when a new invalid link opens', async () => {
    jest.mocked(completeAuthCallback).mockResolvedValueOnce({ email: 'test@example.com' });
    await act(async () => { renderer = create(<AuthCallbackScreen />); });
    expect(texts()).toContain('You’re all set.');
    jest.mocked(Linking.useURL).mockReturnValue('emotionary://auth-callback#error=expired');
    jest.mocked(completeAuthCallback).mockRejectedValueOnce(new Error('Expired'));
    await act(async () => { renderer.update(<AuthCallbackScreen />); });
    expect(texts()).toContain('Let’s try again.');
    expect(texts()).not.toContain('You’re all set.');
  });
});
