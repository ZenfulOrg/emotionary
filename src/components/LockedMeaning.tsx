import { BlurView } from 'expo-blur';
import { router, type Href } from 'expo-router';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Body, Glyph } from '@/components/brand';
import { placeholderText, splitLead } from '@/content/locked-text';
import { mediumImpactHaptic } from '@/feedback/haptics';
import { brand, font, space, tracking, type } from '@/theme/tokens';

/** Any stand-in text under a soft blur, hidden from screen readers. */
export function BlurredText({
  source,
  children,
}: {
  source: string;
  children: (placeholder: string) => React.ReactNode;
}) {
  return (
    <View
      style={styles.blurBox}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {children(placeholderText(source))}
      <BlurView tint="light" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
    </View>
  );
}

/** Opacity of the last readable words, fading into the blur. */
const LEAD_FADE = [0.72, 0.48, 0.28] as const;

/**
 * A word's meaning on the free plan when the word is paid. The first few
 * words read clearly and fade into a soft blur with a slow shine across it,
 * then a round "Reveal" disc that opens the unlock sheet. Curiosity first,
 * not a grey box.
 */
export function LockedMeaning({
  slug,
  definition,
  textStyle,
  withCta = true,
  centered = false,
}: {
  slug: string;
  definition: string;
  textStyle?: StyleProp<TextStyle>;
  withCta?: boolean;
  centered?: boolean;
}) {
  const { lead, rest } = splitLead(definition);
  const fadeFrom = lead.length - LEAD_FADE.length;

  const open = () => {
    mediumImpactHaptic();
    router.push(`/unlock/${slug}` as Href);
  };

  return (
    <View style={[styles.wrap, centered && styles.centered]}>
      <Pressable
        onPress={withCta ? open : undefined}
        disabled={!withCta}
        accessible
        accessibilityRole={withCta ? 'button' : undefined}
        accessibilityLabel={
          lead.length > 0
            ? `Meaning begins: ${lead.join(' ')}. The rest is part of full access.`
            : 'Meaning locked. Part of full access.'
        }
        accessibilityHint={withCta ? 'Opens full access options' : undefined}
      >
        {lead.length > 0 && (
          <Body
            size={type.definition}
            style={[textStyle, styles.lead, centered && styles.centeredText]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {lead.map((word, index) => {
              const fade = index - fadeFrom;
              return (
                <Text key={`${word}-${index}`} style={fade >= 0 ? { opacity: LEAD_FADE[fade] } : undefined}>
                  {word}{index < lead.length - 1 ? ' ' : '…'}
                </Text>
              );
            })}
          </Body>
        )}
        <Shimmer>
          <Body
            size={type.definition}
            style={[textStyle, centered && styles.centeredText]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {placeholderText(rest)}
          </Body>
        </Shimmer>
      </Pressable>

      {withCta && <RevealDisc onPress={open} />}
    </View>
  );
}

/** Blurred content with a slow band of light sweeping across it. */
function Shimmer({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (reducedMotion || width === 0) return;
    x.value = -1;
    x.value = withRepeat(
      withSequence(
        withDelay(900, withTiming(1.4, { duration: 1700, easing: Easing.inOut(Easing.quad) })),
        withTiming(-1, { duration: 0 }),
      ),
      -1,
    );
    return () => cancelAnimation(x);
  }, [reducedMotion, width, x]);

  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * width }, { skewX: '-18deg' }],
  }));

  return (
    <View
      style={styles.blurBox}
      onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))}
    >
      {children}
      <BlurView tint="light" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {!reducedMotion && width > 0 && (
        <Animated.View pointerEvents="none" style={[styles.band, { width: width * 0.35 }, band]}>
          <View style={[styles.bandPart, styles.bandSoft]} />
          <View style={[styles.bandPart, styles.bandCore]} />
          <View style={[styles.bandPart, styles.bandSoft]} />
        </Animated.View>
      )}
    </View>
  );
}

/** The acid disc: an open padlock and "Reveal", breathing gently. */
function RevealDisc({ onPress }: { onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(scale);
  }, [reducedMotion, scale]);

  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.discHalo, breathe]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Reveal its meaning"
        accessibilityHint="Opens full access options"
        style={({ pressed }) => [styles.disc, pressed && styles.discPressed]}
      >
        <Glyph name="unlock" size={20} color={brand.ink} />
        <Text maxFontSizeMultiplier={1.3} style={styles.discLabel}>
          Reveal
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const DISC = 96;
const HALO = DISC + 16;

const styles = StyleSheet.create({
  wrap: { marginTop: space.m, maxWidth: 360 },
  centered: { alignSelf: 'center', alignItems: 'center' },
  centeredText: { textAlign: 'center' },
  lead: { marginBottom: 2 },
  blurBox: { borderRadius: 14, overflow: 'hidden' },
  band: { position: 'absolute', top: -20, bottom: -20, left: 0, flexDirection: 'row' },
  bandPart: { flex: 1 },
  bandSoft: { backgroundColor: 'rgba(255,255,255,0.12)' },
  bandCore: { backgroundColor: 'rgba(255,255,255,0.32)' },
  discHalo: {
    marginTop: space.l,
    alignSelf: 'center',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: 'rgba(242, 194, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    backgroundColor: brand.acid,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  discPressed: { transform: [{ scale: 0.96 }] },
  discLabel: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: tracking(11, 0.18),
    textTransform: 'uppercase',
    color: brand.ink,
  },
});
