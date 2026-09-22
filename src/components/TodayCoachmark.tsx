import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';

import { Body, Eyebrow, FloatingCard, Glyph } from '@/components/brand';
import { brand, space } from '@/theme/tokens';

export function TodayCoachmark({ onOpenShare }: { onOpenShare: () => void }) {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.springify().damping(17)}
      exiting={reducedMotion ? undefined : FadeOutDown.duration(220)}
      style={styles.layer}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onOpenShare}
        accessibilityRole="button"
        accessibilityLabel="Tip: save or share this word. Opens the share card."
      >
        <FloatingCard style={styles.card}>
          <Eyebrow>A little tip</Eyebrow>
          <Body size={17} style={styles.copy}>
            Save the words you love, and share any of them as a card.
          </Body>
          <View style={styles.actions} accessibilityElementsHidden>
            <View style={styles.action}>
              <Glyph name="heart" size={18} />
              <Eyebrow tone="default">Save</Eyebrow>
            </View>
            <View style={styles.action}>
              <Glyph name="leaves" size={18} />
              <Eyebrow tone="default">Share</Eyebrow>
            </View>
          </View>
        </FloatingCard>
        <View style={styles.pointer} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    bottom: space.l,
    zIndex: 18,
  },
  card: { padding: space.l, paddingBottom: space.m },
  copy: { marginTop: space.xs },
  actions: { flexDirection: 'row', gap: space.xl, marginTop: space.m },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  pointer: {
    position: 'absolute',
    bottom: -7,
    left: space.l + 2,
    width: 14,
    height: 14,
    backgroundColor: brand.ink,
    transform: [{ rotate: '45deg' }],
  },
});
