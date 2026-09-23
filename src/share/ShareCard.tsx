import { StyleSheet, Text, View } from 'react-native';

import { Grain, Planets, Wordmark } from '@/components/brand';
import { wordTitleSize } from '@/components/word-title-size';
import { pronunciationLineFor } from '@/content/part-of-speech';
import { asEntry, displayWord } from '@/content/presentation';
import type { Word } from '@/content/types';
import { GroundProvider } from '@/theme/ground';
import { brand, font, grounds, planets, tracking } from '@/theme/tokens';

/** A clean 1080×1920 story card, with the same theme in preview and export. */
export const SHARE_THEMES = [
  { id: 'ink', label: 'Midnight', ground: 'ink', background: brand.ink },
  { id: 'cream', label: 'Cream', ground: 'cream', background: brand.cream },
  { id: 'rose', label: 'Rose', ground: 'cream', background: '#F4E3DB' },
] as const;
export type ShareTheme = (typeof SHARE_THEMES)[number]['id'];

export const CARD_BASE_WIDTH = 1080;
export const CARD_BASE_HEIGHT = 1920;

const PAD = 96;
/** The word's phone size, scaled to the card's text column. */
const WORD_SCALE = (CARD_BASE_WIDTH - PAD * 2) / 327;

export function ShareCard({ word, width, theme = 'ink' }: { word: Word; width: number; theme?: ShareTheme }) {
  const s = width / CARD_BASE_WIDTH;
  const palette = SHARE_THEMES.find((item) => item.id === theme) ?? SHARE_THEMES[0];
  const ground = grounds[palette.ground];
  const px = (n: number) => n * s;
  const wordSize = px(wordTitleSize(word.word) * WORD_SCALE);
  const muted = ground.textMuted;

  const mono = (size: number) => ({
    fontFamily: font.mono,
    fontSize: px(size),
    letterSpacing: px(tracking(size, 0.18)),
    color: muted,
  });

  return (
    <GroundProvider ground={palette.ground}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.background, width, height: px(CARD_BASE_HEIGHT), paddingHorizontal: px(PAD), paddingVertical: px(120) },
        ]}
      >
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
              <Text allowFontScaling={false} style={{ color: ground.eyebrow }}> · </Text>
              {word.language.toUpperCase()}
            </Text>
          </View>
          <View style={{ height: Math.max(1, px(2)), backgroundColor: ground.hairline, marginTop: px(32) }} />
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
              color: ground.text,
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
              color: ground.text,
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
          <View style={{ height: Math.max(1, px(2)), backgroundColor: ground.hairline, marginBottom: px(48) }} />
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
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  entry: { flex: 1, justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
