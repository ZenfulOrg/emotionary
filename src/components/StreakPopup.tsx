import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Eyebrow, FloatingCard, PlanetDot } from '@/components/brand';
import { brand, font, grounds, space } from '@/theme/tokens';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The popup slips away on its own after this long. */
const AUTO_DISMISS_MS = 8000;

/**
 * "Your streak" — pops in once when the app is first opened, then dismisses
 * itself. The week is a row of circles; today is the acid one. A broken
 * streak reads plainly instead.
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
  const insets = useSafeAreaInsets();
  const today = new Date().getDay();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(420)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(340)}
      style={[styles.layer, { top: insets.top + space.s }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={
          wilted
            ? 'Your streak ended. A fresh streak starts today. Dismiss.'
            : `Your streak: ${streak} ${streak === 1 ? 'day' : 'days'}. Dismiss.`
        }
      >
        <FloatingCard>
          <View style={styles.head}>
            <Eyebrow>Your streak</Eyebrow>
            <View style={styles.count}>
              <PlanetDot wordType="wanderword" glow breathing={!wilted} />
              <Eyebrow tone="default">
                {wilted ? 'Begins again' : `${streak} ${streak === 1 ? 'day' : 'days'}`}
              </Eyebrow>
            </View>
          </View>
          <View style={styles.days} accessibilityElementsHidden>
            {DAY_LABELS.map((label, day) => {
              const daysAgo = (today - day + 7) % 7;
              const current = day === today;
              const completed = !current && daysAgo > 0 && daysAgo < streak;
              return (
                <View
                  key={`${label}-${day}`}
                  style={[styles.day, completed && styles.completed, current && styles.current]}
                >
                  <Text
                    style={[styles.dayText, completed && styles.dayTextOn, current && styles.dayTextToday]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          {wilted && (
            <Body size={16} tone="muted" style={styles.wilted}>
              Yesterday slipped by. A new streak starts today.
            </Body>
          )}
        </FloatingCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.m,
    right: space.m,
    zIndex: 20,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.m },
  day: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: grounds.ink.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completed: { borderColor: brand.cream },
  current: { backgroundColor: brand.acid, borderColor: brand.acid },
  dayText: { fontFamily: font.mono, fontSize: 12, color: grounds.ink.textFaint },
  dayTextOn: { color: brand.cream },
  dayTextToday: { color: brand.ink },
  wilted: { marginTop: space.s },
});
