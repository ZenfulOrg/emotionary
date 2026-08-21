import { useEffect } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * 🔥 animated stop-motion style: the flame snaps between a handful of poses
 * with hard cuts (no tweening), like hand-drawn frames.
 */
const FRAME_MS = 150;
const FRAMES = [
  { scaleX: 1, scaleY: 1, rotate: '-3deg', y: 0 },
  { scaleX: 1.09, scaleY: 0.93, rotate: '2deg', y: 1 },
  { scaleX: 0.94, scaleY: 1.08, rotate: '4deg', y: -1.5 },
  { scaleX: 1.05, scaleY: 0.97, rotate: '-1deg', y: 0.5 },
] as const;

export function StopMotionFlame({
  size = 16,
  opacity = 1,
  style,
}: {
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const clock = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(clock);
    clock.set(0);
    if (reducedMotion) return;
    clock.set(
      withRepeat(
        withTiming(FRAMES.length, {
          duration: FRAME_MS * FRAMES.length,
          easing: Easing.linear,
        }),
        -1,
      ),
    );
    return () => cancelAnimation(clock);
  }, [clock, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const frameIndex = Math.max(0, Math.min(Math.floor(clock.get()), FRAMES.length - 1));
    const frame = FRAMES[frameIndex] ?? FRAMES[0];
    return {
      transform: [
        { translateY: frame.y },
        { scaleX: frame.scaleX },
        { scaleY: frame.scaleY },
        { rotate: frame.rotate },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.wrap, animatedStyle, style]}
      pointerEvents="none"
      accessibilityElementsHidden
    >
      <Text style={{ fontSize: size, lineHeight: Math.round(size * 1.25), opacity }}>🔥</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
