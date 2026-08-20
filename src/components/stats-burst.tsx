import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
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

import { levelPalettes } from '@/theme/tokens';

const specks = [
  { x: 0.08, y: 0.1, size: 8, color: levelPalettes[3].deep },
  { x: 0.24, y: 0.16, size: 5, color: levelPalettes[2].deep },
  { x: 0.48, y: 0.09, size: 7, color: levelPalettes[5].deep },
  { x: 0.76, y: 0.15, size: 6, color: levelPalettes[1].deep },
  { x: 0.92, y: 0.24, size: 9, color: levelPalettes[4].deep },
  { x: 0.13, y: 0.35, size: 6, color: levelPalettes[2].deep },
  { x: 0.82, y: 0.39, size: 8, color: levelPalettes[3].deep },
  { x: 0.06, y: 0.54, size: 7, color: levelPalettes[1].deep },
  { x: 0.94, y: 0.57, size: 6, color: levelPalettes[5].deep },
  { x: 0.18, y: 0.7, size: 9, color: levelPalettes[4].deep },
  { x: 0.5, y: 0.76, size: 5, color: levelPalettes[2].deep },
  { x: 0.81, y: 0.72, size: 8, color: levelPalettes[1].deep },
  { x: 0.1, y: 0.88, size: 5, color: levelPalettes[3].deep },
  { x: 0.36, y: 0.91, size: 7, color: levelPalettes[5].deep },
  { x: 0.66, y: 0.87, size: 6, color: levelPalettes[4].deep },
  { x: 0.92, y: 0.9, size: 9, color: levelPalettes[2].deep },
] as const;

/** Roughly how long the opening burst takes before the calm drift begins. */
const BURST_SETTLE_MS = 1400;
/** Base time for one full screen-height of upward drift; varied per speck. */
const FLOAT_BASE_MS = 34000;

export function StatsBurst({ burstKey }: { burstKey: number }) {
  const { width, height } = useWindowDimensions();
  const origin = { x: width / 2, y: height * 0.28 };

  return (
    <View style={styles.layer} pointerEvents="none" accessibilityElementsHidden>
      {specks.map((speck, index) => (
        <BurstSpeck
          key={`${speck.x}-${speck.y}`}
          burstKey={burstKey}
          index={index}
          delay={index * 24}
          finalX={width * speck.x}
          finalY={height * speck.y}
          originX={origin.x}
          originY={origin.y}
          screenHeight={height}
          size={speck.size}
          color={speck.color}
        />
      ))}
    </View>
  );
}

function BurstSpeck({
  burstKey,
  index,
  delay,
  finalX,
  finalY,
  originX,
  originY,
  screenHeight,
  size,
  color,
}: {
  burstKey: number;
  index: number;
  delay: number;
  finalX: number;
  finalY: number;
  originX: number;
  originY: number;
  screenHeight: number;
  size: number;
  color: string;
}) {
  const progress = useSharedValue(1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.48);
  const float = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  // Wrap cycle: a speck fully exits the top before re-entering from below.
  const floatCycle = screenHeight + size * 2;

  useEffect(() => {
    cancelAnimation(progress);
    cancelAnimation(scale);
    cancelAnimation(opacity);

    if (burstKey === 0 || reducedMotion) {
      progress.value = 1;
      scale.value = 1;
      opacity.value = 0.48;
      return;
    }

    progress.value = 0;
    scale.value = 0.2;
    opacity.value = 0;

    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1.2, { duration: 470, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 9, stiffness: 72, mass: 0.82 }),
      ),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.65, { duration: 430, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 8, stiffness: 82, mass: 0.78 }),
      ),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.88, { duration: 210, easing: Easing.out(Easing.quad) }),
        withTiming(0.48, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      ),
    );
  }, [burstKey, delay, opacity, progress, reducedMotion, scale]);

  // After the burst settles, the specks never stop: a slow, constant upward
  // drift, wrapping from the top of the screen back in from the bottom.
  useEffect(() => {
    cancelAnimation(float);
    float.value = 0;
    if (reducedMotion) return;
    const duration = FLOAT_BASE_MS + (index % 5) * 5200;
    float.value = withDelay(
      BURST_SETTLE_MS + delay,
      withRepeat(withTiming(floatCycle, { duration, easing: Easing.linear }), -1),
    );
    return () => cancelAnimation(float);
  }, [burstKey, delay, float, floatCycle, index, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const offset = float.value % floatCycle;
    let driftedY = finalY - offset;
    if (driftedY < -size) driftedY += floatCycle;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: (originX - finalX) * (1 - progress.value) },
        { translateY: (originY - finalY) * (1 - progress.value) + (driftedY - finalY) },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.speck,
        {
          left: finalX,
          top: finalY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  speck: { position: 'absolute' },
});
