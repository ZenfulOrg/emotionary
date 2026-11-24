import { useEffect } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Body, Button, Eyebrow, FloatingCard, Headline, Orbit } from '@/components/brand';
import { StatsBurst } from '@/components/stats-burst';
import { successHaptic } from '@/feedback/haptics';
import { brand, scrim, space } from '@/theme/tokens';

const APP_ICON = require('../../assets/images/icon.png');
const ORBIT_SIZE = 184;
const ICON_SIZE = 76;

/**
 * A pop-up asking them to share Emotionary with a friend (when: see
 * invite/schedule.ts). The card springs up over a dimmed Today, the
 * app icon bobs inside the orbit, and confetti lands as it opens.
 */
export function InvitePrompt({
  eyebrow,
  onShare,
  onDismiss,
}: {
  /** The line above the headline, e.g. "7 days in a row". */
  eyebrow: string;
  onShare: () => void;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();
  // Keep the card clear of the status bar and the gesture bar on short screens.
  const insets = useSafeAreaInsets();
  // On short screens the orbit art is left out so the whole card fits.
  const { height: windowHeight } = useWindowDimensions();
  const showArt = windowHeight >= 760;
  const bob = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Android Back closes the pop-up instead of leaving the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => subscription.remove();
  }, [onDismiss]);

  useEffect(() => {
    successHaptic();
    if (reducedMotion) return;
    // The icon floats gently; the Share button breathes once in a while.
    bob.value = withDelay(
      500,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    pulse.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withSpring(1.05, { damping: 6, stiffness: 180 }),
          withSpring(1, { damping: 8, stiffness: 160 }),
          withTiming(1, { duration: 2200 }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(bob);
      cancelAnimation(pulse);
    };
  }, [bob, pulse, reducedMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * bob.value }, { rotate: `${(bob.value - 0.5) * 6}deg` }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(260)}
        exiting={reducedMotion ? undefined : FadeOut.duration(220)}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        />
      </Animated.View>

      <View style={[styles.center, { paddingTop: insets.top + space.m, paddingBottom: insets.bottom + space.m }]} pointerEvents="box-none">
        <Animated.View
          entering={reducedMotion ? undefined : ZoomIn.delay(80).springify().damping(13).stiffness(140)}
          exiting={reducedMotion ? undefined : ZoomOut.duration(200)}
          style={styles.cardWrap}
        >
          <FloatingCard style={styles.card}>
            {showArt && (
              <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Orbit size={ORBIT_SIZE} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.iconWrap, iconStyle]}>
                  <Image source={APP_ICON} style={styles.icon} />
                </Animated.View>
              </View>
            )}

            <View accessibilityRole="alert" style={styles.copy}>
              <Eyebrow>{eyebrow}</Eyebrow>
              <Headline size={30} style={styles.centered}>
                Share Emotionary with a friend.
              </Headline>
              <Body size={16} tone="muted" style={styles.centered}>
                Know someone who would love a new word for a feeling every day? Send them the app.
              </Body>
            </View>

            <Animated.View style={[styles.shareWrap, buttonStyle]}>
              <Button label="Share with a friend" glyph="leaves" onPress={onShare} style={styles.share} />
            </Animated.View>
            <Button label="Not now" variant="link" onPress={onDismiss} />
          </FloatingCard>
        </Animated.View>
      </View>

      {!reducedMotion && <StatsBurst burstKey={1} />}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40 },
  scrim: { backgroundColor: scrim, opacity: 0.9 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: space.m },
  cardWrap: { width: '100%', maxWidth: 400 },
  card: { width: '100%', paddingHorizontal: space.l, paddingVertical: space.l, alignItems: 'center', gap: space.m },
  art: { width: ORBIT_SIZE, height: ORBIT_SIZE, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    borderRadius: ICON_SIZE * 0.225,
    boxShadow: `0 10px 28px rgba(0, 0, 0, 0.35), 0 0 40px ${brand.acid}33`,
  },
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE * 0.225 },
  copy: { gap: space.s, alignItems: 'center' },
  centered: { textAlign: 'center' },
  shareWrap: { alignSelf: 'stretch', marginTop: space.s },
  share: { minHeight: 52 },
});
