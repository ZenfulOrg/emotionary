import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Planets } from '@/components/brand/Planets';
import { grounds, motion } from '@/theme/tokens';

const RINGS = [1, 0.74, 0.46] as const;

/**
 * The orbit: three hairline rings, the planets riding the middle ring at
 * two o'clock on a 24-second swing. Only ever on ink.
 */
export function Orbit({
  size,
  planets = true,
  style,
}: {
  size: number;
  planets?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const turn = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(turn);
    turn.value = 0;
    if (reducedMotion) return;
    // One slow swing each way per 24 seconds, so the planets drift along the
    // ring but always stay near two o'clock — clear of the words.
    turn.value = withRepeat(
      withTiming(1, { duration: motion.orbitMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(turn);
  }, [reducedMotion, turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${(turn.value - 0.5) * 24}deg` }] }));

  const c = size / 2;
  const r = c * RINGS[1];
  // Two o'clock on the middle ring: 60° clockwise from twelve.
  const planetX = c + r * Math.sin(Math.PI / 3);
  const planetY = c - r * Math.cos(Math.PI / 3);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      {RINGS.map((ratio) => (
        <View
          key={ratio}
          style={[
            styles.ring,
            {
              width: size * ratio,
              height: size * ratio,
              borderRadius: (size * ratio) / 2,
              top: (size - size * ratio) / 2,
              left: (size - size * ratio) / 2,
            },
          ]}
        />
      ))}
      {planets && (
        <Animated.View style={[StyleSheet.absoluteFill, spin]}>
          <Planets
            scale={1}
            style={{ position: 'absolute', left: planetX - 20, top: planetY - 6 }}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * The orbit as a page backdrop: behind the words, right of center, sized so
 * the planets at two o'clock always land on screen.
 */
export function OrbitBackdrop({ top = 24 }: { top?: number | `${number}%` }) {
  const { width } = useWindowDimensions();
  return <Orbit size={width * 0.92} style={{ position: 'absolute', top, left: width * 0.12 }} />;
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: grounds.ink.hairline,
  },
});
