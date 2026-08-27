import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { selectionHaptic } from '@/feedback/haptics';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

export type WidgetGuideVariant = 'home' | 'lock';

const GUIDES: Record<WidgetGuideVariant, { title: string; blurb: string; steps: string[] }> = {
  home: {
    title: 'Home Screen Widget',
    blurb: "Today's word, waiting for you on your Home Screen.",
    steps: [
      'Touch and hold an empty spot on your Home Screen.',
      'Tap Edit in the top corner, then Add Widget.',
      'Search for Emotionary.',
      'Pick a size and tap Add Widget.',
      'To change its look, touch and hold the widget, tap Edit Widget, then choose a theme.',
    ],
  },
  lock: {
    title: 'Lock Screen Widget',
    blurb: 'Meet your word before you even unlock.',
    steps: [
      'Touch and hold your Lock Screen, then tap Customize.',
      'Choose the Lock Screen.',
      'Tap the widget area below the clock.',
      'Add Emotionary and tap Done.',
    ],
  },
};

/**
 * Popup opened from any widget preview: a floating animated mock of the
 * widget plus the steps to add and configure it.
 */
export function WidgetGuideModal({
  variant,
  visible,
  onClose,
}: {
  variant: WidgetGuideVariant;
  visible: boolean;
  onClose: () => void;
}) {
  const guide = GUIDES[variant];

  const close = () => {
    selectionHaptic();
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.title} accessibilityRole="header">
              {guide.title}
            </Text>
            <Text style={styles.blurb}>{guide.blurb}</Text>

            <View style={styles.stage}>
              <FloatingWidgetPreview variant={variant} />
            </View>

            <View style={styles.steps}>
              {guide.steps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepDot}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <Pressable onPress={close} style={styles.doneButton} accessibilityRole="button">
              <Text style={styles.doneText}>GOT IT</Text>
            </Pressable>
          </ScrollView>
          <Pressable
            onPress={close}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close widget guide"
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FloatingWidgetPreview({ variant }: { variant: WidgetGuideVariant }) {
  const bob = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(bob);
    bob.value = 0;
    if (reducedMotion) return;
    bob.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(bob);
  }, [bob, reducedMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -7 * bob.value }, { rotate: `${-0.6 * bob.value}deg` }],
  }));

  return (
    <Animated.View style={floatStyle}>
      {variant === 'home' ? (
        <View style={styles.homeWidget}>
          <Text style={styles.homeWord}>Apricity</Text>
          <Text style={styles.homePronunciation}>[uh-PRIS-ih-tee]</Text>
          <Text style={styles.homeDefinition} numberOfLines={3}>
            The warmth of the sun on a cold winter&apos;s day.
          </Text>
        </View>
      ) : (
        <View style={styles.lockWidget}>
          <Text style={styles.lockTime}>11:11</Text>
          <Text style={styles.lockWord}>Apricity</Text>
          <Text style={styles.lockPronunciation}>[uh-PRIS-ih-tee]</Text>
        </View>
      )}
      <View style={styles.shadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '86%',
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    overflow: 'hidden',
  },
  scroll: { padding: space.l, paddingTop: space.l + 4, alignItems: 'center' },
  close: {
    position: 'absolute',
    right: space.s,
    top: space.s,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 21, color: color.inkMuted },
  title: {
    fontFamily: font.display,
    fontSize: type.title - 4,
    color: color.ink,
    textAlign: 'center',
  },
  blurb: {
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  stage: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: levelPalettes[2].tint,
    paddingVertical: space.l + 6,
    marginTop: space.m,
    overflow: 'hidden',
  },
  homeWidget: {
    width: 138,
    height: 138,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.m,
  },
  homeWord: { fontFamily: font.display, fontSize: type.body + 2, color: color.ink },
  homePronunciation: { fontFamily: font.serif, fontSize: 9, color: color.inkMuted, marginTop: 2 },
  homeDefinition: {
    fontFamily: font.serif,
    fontSize: 9,
    lineHeight: 12,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  lockWidget: {
    width: 150,
    height: 128,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTime: { fontFamily: font.display, fontSize: 25, color: color.paper },
  lockWord: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.paper, marginTop: 4 },
  lockPronunciation: { fontFamily: font.serif, fontSize: 9, color: 'rgba(255,255,255,0.68)' },
  shadow: {
    alignSelf: 'center',
    width: 96,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(33, 28, 21, 0.14)',
    marginTop: 13,
  },
  steps: { alignSelf: 'stretch', gap: space.s + 2, marginTop: space.l },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s + 2 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumber: { fontFamily: font.serifSemiBold, fontSize: type.caption, color: color.paper },
  stepText: {
    flex: 1,
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: 20,
    color: color.ink,
  },
  doneButton: {
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.l,
  },
  doneText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.paper,
  },
});
