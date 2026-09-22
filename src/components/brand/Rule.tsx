import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useGround } from '@/theme/ground';
import { motion } from '@/theme/tokens';

/** The rule that draws itself: a 1px line scaling in from the left. */
export function Rule({
  color,
  delay = 0,
  animate = true,
  style,
}: {
  color?: string;
  delay?: number;
  animate?: boolean;
  style?: ViewStyle;
}) {
  const ground = useGround();
  const reducedMotion = useReducedMotion();
  const drawn = !animate || reducedMotion;
  const progress = useSharedValue(drawn ? 1 : 0);

  useEffect(() => {
    if (drawn) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: motion.ruleMs, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, drawn, progress]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { height: 1, alignSelf: 'stretch', backgroundColor: color ?? ground.hairline, transformOrigin: 'left' },
        animatedStyle,
        style,
      ]}
    />
  );
}
