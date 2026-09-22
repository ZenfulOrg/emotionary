import { StyleSheet, Text, View } from 'react-native';

import { Grain, Orbit, Planets, Wordmark } from '@/components/brand';
import { wordTitleSize } from '@/components/word-title-size';
import { pronunciationLineFor } from '@/content/part-of-speech';
import { asEntry, displayWord } from '@/content/presentation';
import type { Word } from '@/content/types';
import { GroundProvider } from '@/theme/ground';
import { brand, font, grounds, levelPalettes, planets, tracking } from '@/theme/tokens';

/**
 * The share card — the site, folded into a post (brand guide §13). Designed
 * on a 1080×1920 canvas (Instagram / Facebook Stories) and rendered at any
 * width via a scale factor; capture resizes to exactly 1080×1920.
 *
 * Ink ground, the orbit behind the word. Meta row on top over a hairline;
 * pronunciation in mono between slashes; the word lowercase and huge; the
 * definition lowercase ending in a period, then the italic line. Wordmark
 * bottom left, the planets bottom right. The level's mood color is the accent.
 */
export const CARD_BASE_WIDTH = 1080;
export const CARD_BASE_HEIGHT = 1920;

const PAD = 96;
/** The word's phone size, scaled to the card's text column. */
const WORD_SCALE = (CARD_BASE_WIDTH - PAD * 2) / 327;

export function ShareCard({ word, width }: { word: Word; width: number }) {
  const s = width / CARD_BASE_WIDTH;
  const level = levelPalettes[word.level];
  const px = (n: number) => n * s;
  const wordSize = px(wordTitleSize(word.word) * WORD_SCALE);
  const muted = grounds.ink.textMuted;

  const mono = (size: number) => ({
    fontFamily: font.mono,
    fontSize: px(size),
    letterSpacing: px(tracking(size, 0.18)),
    color: muted,
  });

  return (
    <GroundProvider ground="ink">
      <View
        style={[
          styles.card,
          { width, height: px(CARD_BASE_HEIGHT), paddingHorizontal: px(PAD), paddingVertical: px(120) },
        ]}
      >
        <Orbit
          size={px(1500)}
          planets={false}
          style={{ position: 'absolute', top: px(380), left: px(180) }}
        />

        <View>
          <View style={styles.metaRow}>
            <View
              style={{
                width: px(planets[word.type].size * 3),
                height: px(planets[word.type].size * 3),
                borderRadius: px(planets[word.type].size * 1.5),
                backgroundColor: planets[word.type].color,
                marginRight: px(24),
              }}
            />
            <Text allowFontScaling={false} style={[mono(26), styles.flex]} numberOfLines={1}>
              {planets[word.type].label.toUpperCase()}
              <Text allowFontScaling={false} style={{ color: brand.acid }}> · </Text>
              {word.language.toUpperCase()}
            </Text>
            <Text allowFontScaling={false} style={mono(26)}>LEVEL {word.level}</Text>
            <View
              style={{
                width: px(18),
                height: px(18),
                borderRadius: px(9),
                backgroundColor: level.accent,
                marginLeft: px(18),
              }}
            />
          </View>
          <View style={{ height: Math.max(1, px(2)), backgroundColor: grounds.ink.hairline, marginTop: px(32) }} />
        </View>

        <View style={styles.entry}>
          <Text allowFontScaling={false} style={[mono(34), { letterSpacing: px(1.4) }]}>{pronunciationLineFor(word)}</Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: font.display,
              fontSize: wordSize,
              lineHeight: wordSize * 1.1,
              letterSpacing: tracking(wordSize, -0.05),
              color: brand.cream,
              marginTop: px(12),
              marginLeft: -px(8),
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {displayWord(word.word)}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: font.text,
              fontSize: px(58),
              lineHeight: px(76),
              color: brand.cream,
              marginTop: px(40),
            }}
            numberOfLines={6}
          >
            {asEntry(word.definition)}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: font.textItalic,
              fontSize: px(42),
              lineHeight: px(58),
              color: muted,
              marginTop: px(48),
            }}
            numberOfLines={3}
          >
            {word.wisdom}
          </Text>
        </View>

        <View>
          <View style={{ height: Math.max(1, px(2)), backgroundColor: grounds.ink.hairline, marginBottom: px(48) }} />
          <View style={styles.footer}>
            <View>
              <Wordmark size={px(72)} fixed />
              <Text allowFontScaling={false} style={[mono(22), { marginTop: px(12) }]}>EMOTIONARYBOOK.COM</Text>
            </View>
            <Planets scale={px(3)} breathing={false} />
          </View>
        </View>
        <Grain />
      </View>
    </GroundProvider>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: brand.ink, justifyContent: 'space-between', overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  entry: { flex: 1, justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
