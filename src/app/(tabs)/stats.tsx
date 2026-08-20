import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientInk } from '@/components/AmbientInk';
import { StatsBurst } from '@/components/stats-burst';
import { StopMotionFlame } from '@/components/stop-motion-flame';
import { SystemIcon } from '@/components/system-icon';
import { WidgetGuideModal, type WidgetGuideVariant } from '@/components/WidgetGuideModal';
import { mediumImpactHaptic, selectionHaptic } from '@/feedback/haptics';
import { STATS_OPEN_EVENT } from '@/stats/events';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

function StatTile({ value, label, flame = false }: { value: number; label: string; flame?: boolean }) {
  return (
    <View style={styles.tile} accessibilityLabel={`${value} ${label.toLowerCase()}`}>
      <View style={styles.tileValueWrap}>
        {flame && value > 0 && (
          <StopMotionFlame size={46} opacity={0.32} style={styles.tileFlame} />
        )}
        <Text style={styles.tileValue}>{value}</Text>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function SettingsMark() {
  return (
    <View style={styles.settingsMark}>
      <View style={styles.settingsLine}>
        <View style={[styles.settingsKnob, { left: 5 }]} />
      </View>
      <View style={styles.settingsLine}>
        <View style={[styles.settingsKnob, { right: 6 }]} />
      </View>
      <View style={styles.settingsLine}>
        <View style={[styles.settingsKnob, { left: 13 }]} />
      </View>
    </View>
  );
}

function WidgetShowcase({ onOpen }: { onOpen: (variant: WidgetGuideVariant) => void }) {
  return (
    <View style={styles.widgetWrap}>
      <Text style={styles.section}>WIDGETS</Text>
      <View style={styles.widgetCards}>
        <Pressable style={styles.widgetCard} onPress={() => onOpen('home')} accessibilityRole="button">
          <View style={styles.homeWidgetPreview}>
            <Text style={styles.widgetWord}>Apricity</Text>
            <Text style={styles.widgetDefinition} numberOfLines={4}>
              The warmth of the sun on a cold winter&apos;s day.
            </Text>
          </View>
          <Text style={styles.widgetTitle}>Home Screen</Text>
          <Text style={styles.widgetLink}>CONFIGURE</Text>
        </Pressable>
        <Pressable style={styles.widgetCard} onPress={() => onOpen('lock')} accessibilityRole="button">
          <View style={styles.lockWidgetPreview}>
            <Text style={styles.lockTime}>11:19</Text>
            <Text style={styles.lockWidgetWord}>Apricity</Text>
            <Text style={styles.lockWidgetPronunciation}>[uh-PRIS-ih-tee]</Text>
          </View>
          <Text style={styles.widgetTitle}>Lock Screen</Text>
          <Text style={styles.widgetLink}>LEARN HOW</Text>
        </Pressable>
      </View>
      <View style={styles.widgetSettings}>
        <Text style={styles.widgetSettingsTitle}>Widget Settings</Text>
        <SettingsRow label="Topics" value="Mix" />
        <SettingsRow label="Theme" value="Auto" />
        <SettingsRow label="Widget Border" value="On" />
        <SettingsRow label="Refresh" value="Hourly" />
      </View>
    </View>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.widgetSettingsRow}>
      <Text style={styles.widgetSettingsLabel}>{label}</Text>
      <Text style={styles.widgetSettingsValue}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const streak = useUserStore((s) => s.streakState.streak);
  const readCount = useUserStore((s) => s.readSlugs.length);
  const favorites = useUserStore((s) => s.favorites);
  const sharedCount = useUserStore((s) => s.sharedCount);
  const scrollRef = useRef<ScrollView>(null);
  const lastOpenAt = useRef(0);
  const [burstKey, setBurstKey] = useState(0);
  const [widgetGuide, setWidgetGuide] = useState<WidgetGuideVariant | null>(null);

  const allZero = streak === 0 && readCount === 0 && favorites.length === 0 && sharedCount === 0;
  const openStats = useCallback(() => {
    const now = Date.now();
    if (now - lastOpenAt.current < 120) return;
    lastOpenAt.current = now;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    mediumImpactHaptic();
    setBurstKey((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      openStats();
    }, [openStats]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(STATS_OPEN_EVENT, openStats);
    return () => sub.remove();
  }, [openStats]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AmbientInk />
      <StatsBurst burstKey={burstKey} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Your Stats
            </Text>
            <Pressable
              onPress={() => {
                selectionHaptic();
                router.push('/settings');
              }}
              style={styles.settingsButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
            >
              <SettingsMark />
            </Pressable>
        </View>

        {allZero && (
          <Text style={styles.zeroCopy}>Your streak starts today. Read your first word.</Text>
        )}

        <View style={styles.grid}>
          <StatTile value={streak} label="DAY STREAK" flame />
          <StatTile value={readCount} label="WORDS READ" />
          <StatTile value={favorites.length} label="FAVORITED" />
          <StatTile value={sharedCount} label="SHARED" />
        </View>

        <Pressable
          style={styles.favoritesPill}
          onPress={() => {
            selectionHaptic();
            router.push('/favorites' as Href);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Favorited words, ${favorites.length} saved. Opens the list.`}
        >
          <View style={styles.favoritesPillLeft}>
            <SystemIcon name="heart.fill" fallback="♥" size={15} color={levelPalettes[3].deep} />
            <Text style={styles.favoritesPillLabel}>FAVORITED WORDS</Text>
          </View>
          <View style={styles.favoritesPillRight}>
            <Text style={styles.favoritesPillCount}>{favorites.length}</Text>
            <SystemIcon name="chevron.right" fallback="›" size={13} color={color.inkMuted} />
          </View>
        </Pressable>

        <WidgetShowcase
          onOpen={(variant) => {
            selectionHaptic();
            setWidgetGuide(variant);
          }}
        />

      </ScrollView>

      <WidgetGuideModal
        variant={widgetGuide ?? 'home'}
        visible={widgetGuide !== null}
        onClose={() => setWidgetGuide(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { paddingHorizontal: space.l, paddingBottom: 112 },
  headerRow: { marginTop: space.s },
  title: {
    fontFamily: font.display,
    fontSize: type.title,
    color: color.ink,
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  settingsMark: { width: 24, gap: 5 },
  settingsLine: {
    height: 1,
    backgroundColor: color.inkMuted,
  },
  settingsKnob: {
    position: 'absolute',
    top: -3,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.inkMuted,
    backgroundColor: color.paper,
  },
  zeroCopy: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s + 2,
    marginTop: space.l,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: color.card,
    borderColor: color.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: space.l,
  },
  tileValueWrap: { alignItems: 'center', justifyContent: 'center' },
  tileFlame: { position: 'absolute', top: -10 },
  tileValue: { fontFamily: font.display, fontSize: 34, color: color.ink },
  tileLabel: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: 4,
  },
  section: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    marginTop: space.xl,
    marginBottom: space.m,
  },
  favoritesPill: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.card,
    paddingHorizontal: space.m + 4,
    marginTop: space.l,
  },
  favoritesPillLeft: { flexDirection: 'row', alignItems: 'center', gap: space.s + 2 },
  favoritesPillLabel: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
  },
  favoritesPillRight: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  favoritesPillCount: { fontFamily: font.display, fontSize: type.body + 1, color: color.ink },
  widgetWrap: { marginTop: space.xl },
  widgetCards: {
    flexDirection: 'row',
    gap: space.s + 2,
  },
  widgetCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.68)',
    padding: space.m,
    alignItems: 'center',
  },
  homeWidgetPreview: {
    width: 82,
    height: 82,
    borderRadius: 16,
    backgroundColor: levelPalettes[1].deep,
    padding: space.s,
    justifyContent: 'center',
  },
  widgetWord: {
    fontFamily: font.display,
    fontSize: type.small,
    color: levelPalettes[1].onDeep,
    textAlign: 'center',
  },
  widgetDefinition: {
    fontFamily: font.serif,
    fontSize: 8,
    lineHeight: 10,
    color: levelPalettes[1].onDeep,
    textAlign: 'center',
    marginTop: 3,
  },
  lockWidgetPreview: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: color.ink,
    padding: space.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTime: { fontFamily: font.display, fontSize: type.body, color: color.paper },
  lockWidgetWord: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.paper,
    marginTop: 2,
  },
  lockWidgetPronunciation: {
    fontFamily: font.serif,
    fontSize: 7,
    color: 'rgba(255,255,255,0.68)',
  },
  widgetTitle: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.ink,
    marginTop: space.s,
  },
  widgetLink: {
    fontFamily: font.serifMedium,
    fontSize: 8,
    letterSpacing: 0.6,
    color: color.inkMuted,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  widgetSettings: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.card,
    paddingHorizontal: space.m,
    paddingTop: space.m,
    marginTop: space.s + 2,
  },
  widgetSettingsTitle: {
    fontFamily: font.display,
    fontSize: type.body,
    color: color.ink,
    textAlign: 'center',
    marginBottom: space.s,
  },
  widgetSettingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
    paddingVertical: space.s,
  },
  widgetSettingsLabel: { fontFamily: font.serif, fontSize: type.small, color: color.ink },
  widgetSettingsValue: { fontFamily: font.serif, fontSize: type.small, color: color.inkMuted },
});
