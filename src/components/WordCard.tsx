import { BlurView } from 'expo-blur';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Eyebrow, PlanetDot } from '@/components/brand';
import { asEntry, displayWord } from '@/content/presentation';
import type { Word } from '@/content/types';
import { selectionHaptic } from '@/feedback/haptics';
import { brand, font, levelPalettes, planets, space, tracking, type } from '@/theme/tokens';

/** A dictionary row: the word lowercase, its planet, a one-line definition, washed in its level. */
export function WordCard({ word, locked = false }: { word: Word; locked?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        router.push((locked ? '/paywall' : `/word/${word.slug}`) as Href);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: levelPalettes[word.level].tint },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        locked
          ? `${word.word}. Locked. Opens full access.`
          : `${word.word}. ${planets[word.type].label}. ${word.definition}`
      }
    >
      <View style={styles.top}>
        <Text style={styles.word} maxFontSizeMultiplier={1.5} numberOfLines={1}>
          {displayWord(word.word)}
        </Text>
        <PlanetDot wordType={word.type} />
      </View>
      <Body size={type.small} tone="muted" numberOfLines={1} style={styles.preview}>
        {asEntry(word.definition)}
      </Body>
      {locked && (
        <BlurView tint="light" intensity={60} style={styles.lockedBlur} pointerEvents="none">
          <Eyebrow tone="default">Full access</Eyebrow>
        </BlurView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: space.m,
    paddingHorizontal: space.m,
    marginBottom: space.s,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.72 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
  word: {
    flex: 1,
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: tracking(28, -0.03),
    color: brand.ink,
  },
  preview: { marginTop: 2 },
  lockedBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
