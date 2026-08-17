import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useReducedMotion } from 'react-native-reanimated';

import { StopMotionFlame } from '@/components/stop-motion-flame';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The popup slips away on its own after this long. */
const AUTO_DISMISS_MS = 8000;

/**
 * "Your Streak" popup — pops in once when the app is first opened, then
 * dismisses itself. Shows a wilted rose instead of the flame on the day a
 * streak was broken.
 */
export function StreakPopup({
  streak,
  wilted,
  onDismiss,
}: {
  streak: number;
  wilted: boolean;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const today = new Date().getDay();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(420)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(340)}
      style={styles.layer}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onDismiss}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={
          wilted
            ? 'Your streak wilted. A fresh streak starts today. Dismiss.'
            : `Your streak: ${streak} days. Dismiss.`
        }
      >
        <Text style={styles.title}>Your Streak</Text>
        <View style={styles.days}>
          {DAY_LABELS.map((label, day) => {
            const daysAgo = (today - day + 7) % 7;
            const current = day === today;
            const completed = !current && daysAgo > 0 && daysAgo < streak;
            return (
              <View
                key={`${label}-${day}`}
                style={[styles.day, completed && styles.completed, current && styles.current]}
              >
                <Text style={[styles.dayText, current && styles.currentText]}>{label}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.streakRow}>
          {wilted ? (
            <Text style={styles.wiltEmoji}>🥀</Text>
          ) : (
            <StopMotionFlame size={14} />
          )}
          <Text style={styles.streakText}>
            {wilted ? 'Your streak wilted — a new one starts today.' : `${streak}-day streak`}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: space.s,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingHorizontal: space.m,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: space.m,
    paddingVertical: 12,
    boxShadow: '0 10px 26px rgba(67, 52, 35, 0.14)',
  },
  title: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    textTransform: 'uppercase',
    marginBottom: space.s,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completed: { backgroundColor: '#F2E9DE' },
  current: { backgroundColor: color.ink, borderColor: color.ink },
  dayText: { fontFamily: font.serifMedium, fontSize: type.caption, color: color.ink },
  currentText: { color: color.paper },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.s },
  wiltEmoji: { fontSize: 14, lineHeight: 18, transform: [{ rotate: '-8deg' }] },
  streakText: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.ink,
  },
});
