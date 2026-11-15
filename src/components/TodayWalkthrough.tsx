import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';

import { Body, Button, Eyebrow, FloatingCard, Glyph, type GlyphName } from '@/components/brand';
import { selectionHaptic } from '@/feedback/haptics';
import { brand, space } from '@/theme/tokens';

export interface WalkthroughStep {
  glyph: GlyphName;
  title: string;
  body: string;
}

export const WALKTHROUGH_STEPS: readonly WalkthroughStep[] = [
  {
    glyph: 'spark',
    title: "Today's word",
    body: 'A new word arrives every day. Visit daily to grow your streak.',
  },
  {
    glyph: 'listen',
    title: 'Hear it',
    body: 'Tap the sound icon by the pronunciation to hear the word said aloud.',
  },
  {
    glyph: 'up',
    title: 'Keep going',
    body: 'Swipe up to discover more words whenever you like.',
  },
  {
    glyph: 'heart',
    title: 'Keep the ones you love',
    body: 'Tap Save to keep a word in Favorites, or Share to send it as a card.',
  },
];

/**
 * First-visit walkthrough on Today: a short run of tips in a floating card,
 * one at a time. Next advances, Skip ends it; either way it is shown once.
 */
export function TodayWalkthrough({ onDone }: { onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const step = WALKTHROUGH_STEPS[index];
  const last = index === WALKTHROUGH_STEPS.length - 1;

  const next = () => {
    selectionHaptic();
    if (last) onDone();
    else setIndex((i) => i + 1);
  };

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.springify().damping(17)}
      exiting={reducedMotion ? undefined : FadeOutDown.duration(220)}
      style={styles.layer}
      pointerEvents="box-none"
    >
      <FloatingCard style={styles.card}>
        <Animated.View key={index} entering={reducedMotion ? undefined : FadeIn.duration(200)}>
          <View style={styles.head}>
            <Eyebrow>A little tip · {index + 1} of {WALKTHROUGH_STEPS.length}</Eyebrow>
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Skip the tips"
              hitSlop={10}
            >
              <Eyebrow tone="muted">Skip</Eyebrow>
            </Pressable>
          </View>
          <View style={styles.titleRow}>
            <Glyph name={step.glyph} size={22} />
            <Body size={20} style={styles.title} accessibilityRole="header">
              {step.title}
            </Body>
          </View>
          <Body size={17} tone="muted" style={styles.body}>
            {step.body}
          </Body>
        </Animated.View>
        <View style={styles.footer}>
          <View style={styles.dots} accessibilityElementsHidden>
            {WALKTHROUGH_STEPS.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <Button
            label={last ? 'Got it' : 'Next'}
            glyph={last ? undefined : 'forward'}
            onPress={next}
            accessibilityHint={last ? 'Closes the tips' : 'Shows the next tip'}
          />
        </View>
      </FloatingCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    bottom: space.l,
    zIndex: 19,
  },
  card: { padding: space.l },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.m },
  title: { flexShrink: 1 },
  body: { marginTop: space.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.l,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.25, backgroundColor: brand.cream },
  dotOn: { opacity: 1 },
});
