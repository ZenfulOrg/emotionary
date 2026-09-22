import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useGround } from '@/theme/ground';
import { font, tracking, type } from '@/theme/tokens';

type Align = TextStyle['textAlign'];

/** Cormorant defaults to old-style figures; a 1 must never read as an I. */
const LINING: TextStyle['fontVariant'] = ['lining-nums'];
type Tone = 'default' | 'muted' | 'faint';

function useTone(tone: Tone): string {
  const ground = useGround();
  return tone === 'muted' ? ground.textMuted : tone === 'faint' ? ground.textFaint : ground.text;
}

/**
 * The whisper: DM Mono, uppercase, tracked wide, tiny. Never longer than a line.
 * Blue on cream, acid on ink — unless a tone or color is passed.
 */
export function Eyebrow({
  children,
  tone,
  color,
  size = type.eyebrow,
  align,
  style,
  ...rest
}: TextProps & { tone?: Tone; color?: string; size?: number; align?: Align }) {
  const ground = useGround();
  const toneColor = useTone(tone ?? 'default');
  return (
    <Text
      maxFontSizeMultiplier={1.8}
      {...rest}
      style={[
        styles.eyebrow,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.5),
          letterSpacing: tracking(size, 0.18),
          color: color ?? (tone ? toneColor : ground.eyebrow),
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Mono without the tracking of an eyebrow — pronunciation, numbers, meta. */
export function Mono({
  children,
  tone = 'muted',
  color,
  size = 13,
  align,
  style,
  ...rest
}: TextProps & { tone?: Tone; color?: string; size?: number; align?: Align }) {
  const toneColor = useTone(tone);
  return (
    <Text
      maxFontSizeMultiplier={1.8}
      {...rest}
      style={[
        styles.mono,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.45),
          letterSpacing: tracking(size, 0.04),
          color: color ?? toneColor,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** The voice at display size: Medium, tight, calm. Bigger gets tighter. */
export function Headline({
  children,
  size = type.headline,
  tone = 'default',
  color,
  align,
  italic = false,
  style,
  ...rest
}: TextProps & { size?: number; tone?: Tone; color?: string; align?: Align; italic?: boolean }) {
  const toneColor = useTone(tone);
  const em = size >= 56 ? -0.05 : size >= 40 ? -0.045 : -0.03;
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        {
          fontFamily: italic ? font.displayItalic : font.display,
          fontVariant: LINING,
          fontSize: size,
          lineHeight: Math.round(size * 1.08),
          letterSpacing: tracking(size, em),
          color: color ?? toneColor,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** The voice at reading size: Regular, generous leading; italic for examples. */
export function Body({
  children,
  size = type.body,
  tone = 'default',
  color,
  align,
  italic = false,
  style,
  ...rest
}: TextProps & { size?: number; tone?: Tone; color?: string; align?: Align; italic?: boolean }) {
  const toneColor = useTone(tone);
  return (
    <Text
      maxFontSizeMultiplier={2}
      {...rest}
      style={[
        {
          fontFamily: italic ? font.textItalic : font.text,
          fontVariant: LINING,
          fontSize: size,
          lineHeight: Math.round(size * 1.5),
          color: color ?? toneColor,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.mono, textTransform: 'uppercase' },
  mono: { fontFamily: font.mono },
});
