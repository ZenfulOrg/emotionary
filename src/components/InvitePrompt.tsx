import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Eyebrow, FloatingCard, Headline } from '@/components/brand';
import { space } from '@/theme/tokens';

/** After two weeks of near-daily use: share Emotionary with a friend. */
export function InvitePrompt({ onShare, onDismiss }: { onShare: () => void; onDismiss: () => void }) {
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
          <Eyebrow>Two weeks of words</Eyebrow>
          <Headline size={26}>Share it with a friend.</Headline>
          <Body size={16} tone="muted">
            Know someone who would love a new word for a feeling every day? Send them Emotionary.
          </Body>
        </View>
        <View style={styles.actions}>
          <Button label="Share" glyph="leaves" onPress={onShare} style={styles.share} />
          <Button label="Not now" variant="link" onPress={onDismiss} />
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
  share: { minHeight: 46, paddingHorizontal: space.l },
});
