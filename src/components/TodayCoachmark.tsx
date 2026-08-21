import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';

import { SystemIcon } from '@/components/system-icon';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

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
        style={styles.bubble}
        accessibilityRole="button"
        accessibilityLabel="Tip: save or share this word. Open the share card."
      >
        <Text style={styles.eyebrow}>A LITTLE TIP</Text>
        <Text style={styles.copy}>Keep a word close, or tap here to pass it along.</Text>
        <View style={styles.actions} accessibilityElementsHidden>
          <View style={styles.action}>
            <SystemIcon name="heart" fallback="♡" size={18} color={color.ink} />
            <Text style={styles.actionText}>SAVE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.action}>
            <SystemIcon name="square.and.arrow.up" fallback="↑" size={18} color={color.ink} />
            <Text style={styles.actionText}>SHARE</Text>
          </View>
        </View>
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
    alignItems: 'center',
  },
  bubble: {
    width: '100%',
    maxWidth: 310,
    alignItems: 'center',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: space.l,
    paddingTop: space.m,
    paddingBottom: 13,
    boxShadow: '0 12px 30px rgba(67, 52, 35, 0.18)',
  },
  eyebrow: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  copy: {
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.ink,
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    marginTop: space.m,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: color.hairline },
  pointer: {
    position: 'absolute',
    bottom: -7,
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
});
