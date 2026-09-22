import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Eyebrow, FloatingCard, Headline } from '@/components/brand';
import { space } from '@/theme/tokens';

export function NotificationPermissionPrompt({
  busy,
  onEnable,
  onDismiss,
}: {
  busy: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(360)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(240)}
      style={[styles.layer, { top: insets.top + space.s }]}
      pointerEvents="box-none"
    >
      <FloatingCard style={styles.card}>
        <View accessibilityRole="alert" style={styles.copy}>
          <Eyebrow>A word, every day</Eyebrow>
          <Headline size={26}>Never miss your word.</Headline>
          <Body size={16} tone="muted">
            One gentle reminder a day, at the time you chose.
          </Body>
        </View>
        <View style={styles.actions}>
          <Button label="Enable" onPress={onEnable} busy={busy} style={styles.enable} />
          <Button label="Not now" variant="link" onPress={onDismiss} disabled={busy} />
        </View>
      </FloatingCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.m,
    right: space.m,
    zIndex: 20,
    alignItems: 'center',
  },
  card: { width: '100%', maxWidth: 400, padding: space.l, gap: space.m },
  copy: { gap: space.s },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  enable: { minHeight: 46, paddingHorizontal: space.l },
});
