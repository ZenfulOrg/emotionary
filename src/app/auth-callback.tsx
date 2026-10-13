import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, OrbitBackdrop, Screen, Wordmark } from '@/components/brand';
import { completeAuthCallback } from '@/auth/client';
import { brand, layout, space } from '@/theme/tokens';

export default function AuthCallbackScreen() {
  const liveUrl = Linking.useURL();
  return <AuthCallbackContent key={liveUrl ?? 'initial'} liveUrl={liveUrl} />;
}

function AuthCallbackContent({ liveUrl }: { liveUrl: string | null }) {
  const [status, setStatus] = useState('Confirming your account…');
  const [result, setResult] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = liveUrl ?? (await Linking.getInitialURL());
      if (!url) {
        if (!cancelled) {
          setStatus('This confirmation link is invalid or expired.');
          setResult('error');
        }
        return;
      }
      try {
        const account = await completeAuthCallback(url);
        if (!cancelled) {
          setStatus(account.email ? `${account.email} is confirmed.` : 'Your email is confirmed.');
          setResult('success');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'This confirmation link could not be completed.');
          setResult('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [liveUrl]);

  return (
    <Screen ground="ink" edges={['top', 'bottom']}>
      <OrbitBackdrop top="12%" />
      <View style={styles.content}>
        <Wordmark size={32} />
        <View style={styles.copy} accessibilityLiveRegion="polite">
          <Eyebrow>{result === 'pending' ? 'One moment' : 'Account'}</Eyebrow>
          <Headline size={44}>{result === 'success' ? 'You’re all set.' : result === 'error' ? 'Let’s try again.' : 'Confirming.'}</Headline>
          <Body tone="muted">{status}</Body>
          {result === 'pending' && <ActivityIndicator color={brand.acid} style={styles.spinner} />}
        </View>
        {result !== 'pending' && (
          <Button
            label={result === 'success' ? 'Continue to Emotionary' : 'Return to sign in'}
            onPress={() => router.replace(result === 'success' ? '/' : '/account')}
            glyph="forward"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: space.l,
  },
  copy: { gap: space.m },
  spinner: { alignSelf: 'flex-start' },
});
