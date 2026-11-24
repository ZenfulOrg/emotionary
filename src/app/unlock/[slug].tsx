import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnlockSheet } from '@/components/UnlockSheet';
import { findWord, useContentStore } from '@/content/store';
import { useUserStore } from '@/store/userStore';
import { brand, layout, space } from '@/theme/tokens';
import { setPaywallPlacement, track } from '@/analytics/track';

/**
 * "Unlock its meaning": a short bottom sheet over Today, where a free user
 * lands from the daily notification or the blurred meaning when today's word
 * is a paid word. The word stays visible behind the sheet. Buying reveals the
 * word straight away; "Not now" closes the sheet.
 */
export default function UnlockScreen() {
  useEffect(() => {
    setPaywallPlacement('unlock');
    track('paywall_shown', { placement: 'unlock' });
  }, []);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const words = useContentStore((s) => s.words);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const word = slug ? findWord(words, slug) : undefined;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // Unlocked (just bought, restored, or a paid user): reveal the word.
  // Unknown word (e.g. unpublished): fall back to the regular paywall.
  useEffect(() => {
    if (!word) router.replace('/paywall' as Href);
    else if (hasFullAccess) router.replace(`/word/${word.slug}` as Href);
  }, [hasFullAccess, word]);

  if (!word) return null;

  return (
    <View style={[styles.sheet, { paddingBottom: space.s + (Platform.OS === 'android' ? insets.bottom : 0) }]}>
      <UnlockSheet
        // Purchase success flips hasFullAccess; the effect above reveals the word.
        onPurchased={() => router.replace(`/word/${word.slug}` as Href)}
        onNotNow={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: brand.cream,
    paddingHorizontal: layout.gutter,
    paddingTop: space.xl,
    // iOS: the sheet already sits above the home indicator. Android adds the
    // bottom inset, since it draws edge to edge under the nav bar.
    paddingBottom: space.s,
  },
});
