import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Eyebrow, Glyph } from '@/components/brand';
import { selectionHaptic } from '@/feedback/haptics';
import { layout, space } from '@/theme/tokens';

/**
 * A quiet cue under Today's first word that more words wait below: a small
 * label and an arrow that gently bobs downward. Tapping it moves to the next
 * word, the same as swiping up.
 */
export function ScrollHint({ label, onPress }: { label: string; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    offset.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [offset, reducedMotion]);

  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Shows the next word"
      hitSlop={8}
      style={({ pressed }) => [styles.hint, pressed && styles.pressed]}
    >
      <Eyebrow tone="muted">{label}</Eyebrow>
      <Animated.View style={arrowStyle}>
        <Glyph name="down" size={18} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    minHeight: layout.touch,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: space.s,
  },
  pressed: { opacity: 0.6 },
});
