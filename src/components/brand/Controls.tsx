import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Glyph, type GlyphName } from '@/components/brand/Glyph';
import { Body, Eyebrow } from '@/components/brand/Typography';
import { selectionHaptic } from '@/feedback/haptics';
import { useGround } from '@/theme/ground';
import { brand, font, layout, space, tracking, type } from '@/theme/tokens';

type ButtonVariant = 'solid' | 'outline' | 'link';

/**
 * The one button. Mono label, square corners — circles are the only round
 * thing. Solid is ink on cream and acid on ink (ink on acid, 7.9:1).
 */
export function Button({
  label,
  onPress,
  variant = 'solid',
  glyph,
  busy = false,
  disabled = false,
  haptic = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  glyph?: GlyphName;
  busy?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  const ground = useGround();
  const solidFill = ground.name === 'ink' ? brand.acid : brand.ink;
  const solidText = ground.name === 'ink' ? brand.ink : brand.cream;
  const labelColor = variant === 'solid' ? solidText : ground.text;
  const inactive = disabled || busy;

  return (
    <Pressable
      onPress={() => {
        if (haptic) selectionHaptic();
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      hitSlop={variant === 'link' ? 8 : undefined}
      style={({ pressed }) => [
        variant === 'link' ? styles.link : styles.button,
        variant === 'solid' && { backgroundColor: solidFill },
        variant === 'outline' && { borderColor: ground.text, borderWidth: 1 },
        variant === 'outline' && pressed && { backgroundColor: ground.wash },
        pressed && variant !== 'outline' && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          <Text
            maxFontSizeMultiplier={1.6}
            style={[
              styles.label,
              { color: labelColor },
              variant === 'link' && { textDecorationLine: 'underline', textDecorationColor: labelColor },
            ]}
          >
            {label}
          </Text>
          {glyph && <Glyph name={glyph} size={variant === 'link' ? 14 : 16} color={labelColor} />}
        </>
      )}
    </Pressable>
  );
}

/** The round CTA: an acid disc, label centered, arrow tucked bottom right. Once per page, last. */
export function RoundCta({
  label,
  onPress,
  size = 132,
  accessibilityHint,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  size?: number;
  accessibilityHint?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.round,
        disabled && styles.inactive,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.roundPressed,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={[styles.label, styles.roundLabel]}>
        {label}
      </Text>
      <View style={[styles.roundArrow, { right: size * 0.2, bottom: size * 0.17 }]}>
        <Glyph name="scrolls" size={16} color={brand.ink} />
      </View>
    </Pressable>
  );
}

/** A glyph-only control with a full 44pt target and a spoken label. */
export function IconButton({
  glyph,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
  style,
}: {
  glyph: GlyphName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.icon, pressed && styles.pressed, style]}
    >
      <Glyph name={glyph} size={size} color={color} />
    </Pressable>
  );
}

/** Square filter / choice chip: mono label, ink fill when selected. */
export function Chip({
  label,
  selected,
  onPress,
  leading,
  accessibilityLabel,
  role = 'button',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  accessibilityLabel?: string;
  role?: 'button' | 'radio';
}) {
  const ground = useGround();
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? ground.text : ground.hairline },
        selected && { backgroundColor: ground.text },
        pressed && !selected && { backgroundColor: ground.wash },
      ]}
    >
      {leading}
      <Text
        maxFontSizeMultiplier={1.6}
        style={[styles.chipLabel, { color: selected ? ground.background : ground.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A selectable square box — checkbox or radio — with a circular indicator. */
export function OptionRow({
  title,
  body,
  selected,
  onPress,
  role,
  aside,
  eyebrow,
  accessibilityLabel,
}: {
  title: string;
  body?: string;
  selected: boolean;
  onPress: () => void;
  role: 'checkbox' | 'radio';
  aside?: ReactNode;
  eyebrow?: string;
  accessibilityLabel?: string;
}) {
  const ground = useGround();
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? [title, body].filter(Boolean).join('. ')}
      style={({ pressed }) => [
        styles.option,
        { borderColor: selected ? ground.text : ground.hairline },
        (selected || pressed) && { backgroundColor: ground.wash },
      ]}
    >
      <View style={[styles.indicator, { borderColor: selected ? ground.text : ground.textFaint }]}>
        {selected && <View style={[styles.indicatorDot, { backgroundColor: ground.text }]} />}
      </View>
      <View style={styles.optionCopy}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Text maxFontSizeMultiplier={1.5} style={[styles.optionTitle, { color: ground.text }]}>
          {title}
        </Text>
        {body && (
          <Body size={type.small} tone="muted" style={styles.optionBody}>
            {body}
          </Body>
        )}
      </View>
      {aside}
    </Pressable>
  );
}

/** Square text field with a hairline box. */
export const TextField = forwardRef<TextInput, TextInputProps & { trailing?: ReactNode }>(
  function TextField({ trailing, style, ...props }, ref) {
    const ground = useGround();
    return (
      <View style={[styles.field, { borderColor: ground.hairline }]}>
        <TextInput
          ref={ref}
          placeholderTextColor={ground.textMuted}
          selectionColor={ground.text}
          maxFontSizeMultiplier={1.6}
          {...props}
          style={[styles.fieldInput, { color: ground.text }, style]}
        />
        {trailing}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    paddingHorizontal: space.l,
  },
  link: {
    minHeight: layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: space.xs,
  },
  label: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: tracking(12, 0.16),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
  inactive: { opacity: 0.45 },
  round: {
    backgroundColor: brand.acid,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.m,
    boxShadow: `0 0 36px ${brand.acid}40`,
  },
  roundPressed: { transform: [{ scale: 0.96 }] },
  roundLabel: { color: brand.ink, lineHeight: 18 },
  roundArrow: { position: 'absolute' },
  icon: {
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: tracking(11, 0.14),
    textTransform: 'uppercase',
  },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderWidth: 1,
    paddingHorizontal: space.m,
    paddingVertical: 12,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: { width: 10, height: 10, borderRadius: 5 },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: font.display, fontSize: type.lead, lineHeight: 24 },
  optionBody: { lineHeight: 21 },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  fieldInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: space.m,
    fontFamily: font.text,
    fontSize: type.body,
  },
});
