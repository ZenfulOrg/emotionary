import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Body, Button, Dialog, Eyebrow, Headline, Mono, Rule } from '@/components/brand';
import { WidgetPreview } from '@/components/WidgetPreview';
import { brand, grounds, space } from '@/theme/tokens';

export type WidgetGuideVariant = 'home' | 'lock';

const GUIDES: Record<WidgetGuideVariant, { title: string; blurb: string; steps: string[] }> = {
  home: {
    title: 'Home Screen widget.',
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
    title: 'Lock Screen widget.',
    blurb: 'Meet your word before you even unlock.',
    steps: [
      'Touch and hold your Lock Screen, then tap Customize.',
      'Choose the Lock Screen.',
      'Tap the widget area below the clock.',
      'Add Emotionary and tap Done.',
    ],
  },
};

/** How to add a widget: a floating mock of it, then numbered steps in the mono. */
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
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    const timer = setInterval(
      () => setActiveStep((current) => (current + 1) % guide.steps.length),
      1800,
    );
    return () => clearInterval(timer);
  }, [guide.steps.length, reducedMotion, variant, visible]);

  return (
    <Dialog visible={visible} onClose={onClose} closeLabel="Close widget guide">
      <Eyebrow>Widgets</Eyebrow>
      <Headline size={34} style={styles.title}>
        {guide.title}
      </Headline>
      <Body tone="muted">{guide.blurb}</Body>

      <View style={styles.stage}>
        <FloatingWidget variant={variant} />
        <Mono size={11} color={grounds.ink.textMuted} style={styles.stageStep}>
          STEP {String(activeStep + 1).padStart(2, '0')} / {String(guide.steps.length).padStart(2, '0')}
        </Mono>
      </View>

      <Rule animate={false} style={styles.rule} />
      {guide.steps.map((step, index) => {
        const active = index === activeStep;
        return (
          <View key={step} style={styles.stepRow} accessible>
            <Mono size={12} tone={active ? 'default' : 'faint'} style={styles.stepNumber}>
              {String(index + 1).padStart(2, '0')}
            </Mono>
            <Body size={17} tone={active ? 'default' : 'muted'} style={styles.stepText}>
              {step}
            </Body>
          </View>
        );
      })}

      <Button label="Got it" onPress={onClose} style={styles.done} />
    </Dialog>
  );
}

function FloatingWidget({ variant }: { variant: WidgetGuideVariant }) {
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
      <WidgetPreview variant={variant} size={140} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.s, marginBottom: space.xs },
  stage: {
    alignItems: 'center',
    backgroundColor: brand.ink,
    paddingVertical: space.xl,
    marginTop: space.l,
  },
  stageStep: { marginTop: space.l },
  rule: { marginTop: space.l },
  stepRow: { flexDirection: 'row', gap: space.m, marginTop: space.m },
  stepNumber: { width: 22, paddingTop: 3 },
  stepText: { flex: 1, lineHeight: 24 },
  done: { marginTop: space.xl },
});
