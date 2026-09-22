import { StyleSheet, Text, View } from 'react-native';

import { brand, font, grounds, tracking } from '@/theme/tokens';

const SAMPLE = {
  word: 'apricity',
  pronunciation: '/uh-PRIS-ih-tee/',
  definition: 'the warmth of the sun in winter.',
};

/**
 * A mock of the real widgets, drawn in the brand: cream Home Screen tile,
 * ink Lock Screen. The rounded corners belong to iOS, not to us.
 */
export function WidgetPreview({ variant, size = 132 }: { variant: 'home' | 'lock'; size?: number }) {
  const s = size / 132;
  if (variant === 'lock') {
    return (
      <View
        style={[styles.tile, styles.lock, { width: size, height: size, borderRadius: 28 * s }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[styles.time, { fontSize: 30 * s }]}>11:11</Text>
        <Text style={[styles.lockWord, { fontSize: 20 * s }]}>{SAMPLE.word}</Text>
        <Text style={[styles.mono, styles.lockMono, { fontSize: 8 * s }]}>{SAMPLE.pronunciation}</Text>
      </View>
    );
  }
  return (
    <View
      style={[styles.tile, styles.home, { width: size, height: size, borderRadius: 26 * s, padding: 14 * s }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.mono, styles.homeMono, { fontSize: 7 * s }]}>TODAY · LATIN</Text>
      <Text style={[styles.homeWord, { fontSize: 24 * s, letterSpacing: tracking(24 * s, -0.04) }]}>
        {SAMPLE.word}
        <Text style={styles.period}>.</Text>
      </Text>
      <Text style={[styles.homeDefinition, { fontSize: 11 * s, lineHeight: 14 * s }]} numberOfLines={3}>
        {SAMPLE.definition}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden' },
  home: {
    backgroundColor: brand.cream,
    justifyContent: 'flex-end',
    boxShadow: '0 10px 26px rgba(24, 51, 77, 0.18)',
  },
  lock: {
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: grounds.ink.hairline,
  },
  mono: { fontFamily: font.mono, letterSpacing: 1 },
  homeMono: { color: brand.blue, marginBottom: 'auto' },
  homeWord: { fontFamily: font.display, color: brand.ink },
  period: { color: brand.acid },
  homeDefinition: { fontFamily: font.text, color: grounds.cream.textMuted, marginTop: 2 },
  time: { fontFamily: font.display, fontVariant: ['lining-nums'], color: brand.cream },
  lockWord: { fontFamily: font.display, color: brand.cream, marginTop: 2 },
  lockMono: { color: grounds.ink.textMuted, marginTop: 2 },
});
