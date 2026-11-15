import { Pressable, StyleSheet } from 'react-native';

import { Glyph } from '@/components/brand/Glyph';
import { selectionHaptic } from '@/feedback/haptics';
import { useGround } from '@/theme/ground';

export function TermsCheckbox({
  value,
  onValueChange,
  testID,
  size = 22,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
  size?: number;
}) {
  const ground = useGround();
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onValueChange(!value);
      }}
      style={[
        styles.box,
        { width: size, height: size, borderColor: ground.textMuted },
        value && { backgroundColor: ground.text, borderColor: ground.text },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Agree to the Terms of Use and Privacy Policy"
      // Keep a full 44pt target however small the box is drawn.
      hitSlop={Math.max(11, Math.ceil((44 - size) / 2))}
      testID={testID}
    >
      {value && <Glyph name="check" size={Math.round(size * 0.72)} strokeWidth={2} color={ground.background} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
