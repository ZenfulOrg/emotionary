import { Pressable, StyleSheet } from 'react-native';

import { SystemIcon } from '@/components/system-icon';
import { selectionHaptic } from '@/feedback/haptics';
import { color } from '@/theme/tokens';

export function TermsCheckbox({
  value,
  onValueChange,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onValueChange(!value);
      }}
      style={[styles.box, value && styles.boxChecked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Agree to the Terms of Use and Privacy Policy"
      hitSlop={8}
      testID={testID}
    >
      {value && <SystemIcon name="checkmark" fallback="✓" size={14} color={color.paper} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: color.inkMuted,
    backgroundColor: 'rgba(255,255,255,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: color.ink, borderColor: color.ink },
});
