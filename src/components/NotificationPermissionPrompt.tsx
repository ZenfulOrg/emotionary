import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useReducedMotion } from 'react-native-reanimated';

import { SystemIcon } from '@/components/system-icon';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

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

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(360)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(240)}
      style={styles.layer}
      pointerEvents="box-none"
    >
      <View style={styles.card} accessibilityRole="alert">
        <View style={styles.icon} accessibilityElementsHidden>
          <SystemIcon name="bell" fallback="◉" size={19} color={color.ink} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Never miss your word</Text>
          <Text style={styles.body}>Enable a gentle daily reminder.</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onEnable}
              disabled={busy}
              style={[styles.enable, busy && styles.disabled]}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator size="small" color={color.paper} />
              ) : (
                <Text style={styles.enableText}>ENABLE</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onDismiss}
              disabled={busy}
              style={styles.later}
              accessibilityRole="button"
            >
              <Text style={styles.laterText}>NOT NOW</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: space.l,
    left: space.m,
    right: space.m,
    zIndex: 20,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    flexDirection: 'row',
    gap: space.m,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: space.m,
    boxShadow: '0 10px 26px rgba(67, 52, 35, 0.16)',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2E9DE',
  },
  copy: { flex: 1 },
  title: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.ink },
  body: { fontFamily: font.serif, fontSize: type.caption, color: color.inkMuted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.s },
  enable: {
    minWidth: 82,
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.ink,
  },
  enableText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.paper,
  },
  later: { minHeight: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  laterText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  disabled: { opacity: 0.58 },
});
