import { Text, type TextStyle } from 'react-native';

import { useGround } from '@/theme/ground';
import { brand, font, tracking } from '@/theme/tokens';

/**
 * The wordmark: lowercase, tight, one acid period — on every ground.
 * Never capitalized, never in the mono, never loosened. Minimum 24pt on
 * screen — only a scaled-down preview of a larger canvas goes below.
 */
export function Wordmark({
  size = 28,
  color,
  style,
  header = false,
  fixed = false,
}: {
  /** a fixed canvas (the share card) ignores Dynamic Type */
  fixed?: boolean;
  size?: number;
  color?: string;
  style?: TextStyle;
  header?: boolean;
}) {
  const ground = useGround();
  return (
    <Text
      accessibilityRole={header ? 'header' : 'text'}
      accessibilityLabel="Emotionary"
      maxFontSizeMultiplier={1.3}
      allowFontScaling={!fixed}
      style={[
        {
          fontFamily: font.display,
          fontSize: size,
          lineHeight: Math.round(size * 1.1),
          letterSpacing: tracking(size, -0.04),
          color: color ?? ground.text,
        },
        style,
      ]}
    >
      emotionary<Text style={{ color: brand.acid }}>.</Text>
    </Text>
  );
}
