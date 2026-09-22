import Svg, { Circle, Path } from 'react-native-svg';

import { useGround } from '@/theme/ground';

/**
 * There is no icon set — the type is the icons. These single-stroke glyphs
 * exist only for places that cannot set a character: 24px box, 1.6px stroke,
 * ink by default. Always decorative; the control around them carries the label.
 */
const STROKES = {
  leaves: 'M7 17 17 7M9 7h8v8',
  scrolls: 'M7 7l10 10M17 9v8H9',
  back: 'M19 12H5M11 6l-6 6 6 6',
  forward: 'M5 12h14M13 6l6 6-6 6',
  spark: 'M4 13c2.5-4 5-4 8-1s5.5 3 8-1',
  menu: 'M4 9h16M4 15h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l5 4.5 9-10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  pause: 'M9 6v12M15 6v12',
  eyeOff: 'M2.5 12C5 7.5 8.3 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.8 6.5-9.5 6.5S5 16.5 2.5 12ZM4 4l16 16',
  eye: 'M2.5 12C5 7.5 8.3 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.8 6.5-9.5 6.5S5 16.5 2.5 12Z',
} as const;

const HEART =
  'M12 19.5S4 14.3 4 9.1C4 6.4 6.1 4.5 8.5 4.5c1.6 0 2.9.9 3.5 2.2.6-1.3 1.9-2.2 3.5-2.2 2.4 0 4.5 1.9 4.5 4.6 0 5.2-8 10.4-8 10.4Z';

export type GlyphName = keyof typeof STROKES | 'home' | 'heart' | 'heartFilled' | 'listen';

export function Glyph({
  name,
  size = 24,
  color,
  strokeWidth = 1.6,
}: {
  name: GlyphName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const ground = useGround();
  const tint = color ?? ground.text;
  const stroke = { stroke: tint, strokeWidth, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'home' ? (
        <Circle cx={12} cy={12} r={7} {...stroke} />
      ) : name === 'heart' ? (
        <Path d={HEART} {...stroke} />
      ) : name === 'heartFilled' ? (
        <Path d={HEART} {...stroke} fill={tint} />
      ) : name === 'listen' ? (
        <Path d="M14.5 4a8 8 0 0 0 0 16Z" fill={tint} />
      ) : (
        <>
          <Path d={STROKES[name]} {...stroke} />
          {name === 'eye' && <Circle cx={12} cy={12} r={2.8} {...stroke} />}
        </>
      )}
    </Svg>
  );
}
