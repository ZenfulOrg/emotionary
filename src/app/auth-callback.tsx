import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { completeAuthCallback } from '@/auth/client';
import { color, font, space, type } from '@/theme/tokens';

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
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        {!complete && <ActivityIndicator color={color.ink} />}
        <Text style={styles.title}>{complete ? 'Account confirmed' : 'One moment'}</Text>
        <Text style={styles.body}>{status}</Text>
        {complete && (
          <Pressable onPress={() => router.replace('/')} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>CONTINUE TO EMOTIONARY</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper, padding: space.l, justifyContent: 'center' },
  card: { alignItems: 'center', backgroundColor: color.card, borderRadius: 24, borderCurve: 'continuous', padding: 34 },
  title: { fontFamily: font.display, fontSize: 34, color: color.ink, marginTop: space.m, textAlign: 'center' },
  body: { fontFamily: font.serif, fontSize: type.body, lineHeight: 25, color: color.inkMuted, marginTop: space.s, textAlign: 'center' },
  button: { borderRadius: 999, backgroundColor: color.ink, paddingHorizontal: 24, paddingVertical: 14, marginTop: space.l },
  buttonText: { fontFamily: font.serifMedium, fontSize: 11, letterSpacing: 1.2, color: color.paper },
});
