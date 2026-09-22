import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, OrbitBackdrop, Screen, Wordmark } from '@/components/brand';
import { completeAuthCallback } from '@/auth/client';
import { brand, layout, space } from '@/theme/tokens';

export default function AuthCallbackScreen() {
  const liveUrl = Linking.useURL();
  const [status, setStatus] = useState('Confirming your account…');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = liveUrl ?? (await Linking.getInitialURL());
      if (!url) {
        setStatus('This confirmation link is invalid or expired.');
        setComplete(true);
        return;
      }
      try {
        const account = await completeAuthCallback(url);
        if (!cancelled) {
          setStatus(account.email ? `${account.email} is confirmed.` : 'Your email is confirmed.');
          setComplete(true);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'This confirmation link could not be completed.');
          setComplete(true);
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
          <Eyebrow>{complete ? 'Account' : 'One moment'}</Eyebrow>
          <Headline size={44}>{complete ? 'You’re all set.' : 'Confirming.'}</Headline>
          <Body tone="muted">{status}</Body>
          {!complete && <ActivityIndicator color={brand.acid} style={styles.spinner} />}
        </View>
        {complete && (
          <Button label="Continue to Emotionary" onPress={() => router.replace('/')} glyph="forward" />
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
