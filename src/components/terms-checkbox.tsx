import { Pressable, StyleSheet } from 'react-native';

import { Glyph } from '@/components/brand/Glyph';
import { selectionHaptic } from '@/feedback/haptics';
import { useGround } from '@/theme/ground';

export function TermsCheckbox({
  value,
  onValueChange,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
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
        { borderColor: ground.text },
        value && { backgroundColor: ground.text },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Agree to the Terms of Use and Privacy Policy"
      hitSlop={11}
      testID={testID}
    >
      {value && <Glyph name="check" size={16} strokeWidth={2} color={ground.background} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
