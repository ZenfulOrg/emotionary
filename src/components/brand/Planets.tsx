import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { WordType } from '@/content/types';
import { motion, PLANET_ORDER, planets } from '@/theme/tokens';

/** One planet: a category dot at its brand size, softly glowing. */
export function PlanetDot({
  wordType,
  scale = 1,
  glow = false,
  breathing = false,
  delay = 0,
  style,
}: {
  wordType: WordType;
  scale?: number;
  glow?: boolean;
  breathing?: boolean;
  delay?: number;
  style?: ViewStyle;
}) {
  const planet = planets[wordType];
  const size = Math.round(planet.size * scale);
  const breath = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const animate = breathing && !reducedMotion;

  useEffect(() => {
    cancelAnimation(breath);
    breath.value = 0;
    if (!animate) return;
    breath.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: motion.breatheMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(breath);
  }, [animate, breath, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.14 * breath.value }],
    opacity: 0.86 + 0.14 * breath.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: planet.color,
          boxShadow: glow ? `0 0 ${size}px ${planet.color}99` : undefined,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * The mark: three planets, always in this order — acid, blue, pink — 7px
 * apart and tilted 12° on the orbit. Never stack them above the wordmark.
 */
export function Planets({
  scale = 1,
  glow = true,
  breathing = true,
  tilt = true,
  style,
}: {
  scale?: number;
  glow?: boolean;
  breathing?: boolean;
  tilt?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[styles.row, { gap: 7 * scale }, tilt && styles.tilt, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {PLANET_ORDER.map((wordType, index) => (
        <PlanetDot
          key={wordType}
          wordType={wordType}
          scale={scale}
          glow={glow}
          breathing={breathing}
          delay={index * 420}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tilt: { transform: [{ rotate: '12deg' }] },
});
