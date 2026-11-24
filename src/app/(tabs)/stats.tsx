import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Body,
  Button,
  Eyebrow,
  Glyph,
  Headline,
  IconButton,
  Mono,
  OrbitBackdrop,
  Panel,
  PlanetDot,
  RoundCta,
  Rule,
  Screen,
} from '@/components/brand';
import { NotificationTimes } from '@/components/NotificationTimes';
import { StatsBurst } from '@/components/stats-burst';
import { WidgetGuideModal, type WidgetGuideVariant } from '@/components/WidgetGuideModal';
import { WidgetPreview } from '@/components/WidgetPreview';
import { mediumImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { shareInvite } from '@/invite/invite';
import { trackInvite } from '@/invite/track';
import { requestPermission } from '@/notifications/scheduler';
import { STATS_OPEN_EVENT } from '@/stats/events';
import { sortedNotifTimes, useUserStore } from '@/store/userStore';
import { useGround } from '@/theme/ground';
import { font, layout, space, tracking } from '@/theme/tokens';

const INSTAGRAM_URL = 'https://www.instagram.com/emotionarybook?igsi=ZTZ5MWFyMG1tbmZo';
const BOOK_URL = 'https://emotionarybook.com';

function StatTile({
  index,
  value,
  label,
  streak = false,
  second = false,
  onPress,
}: {
  second?: boolean;
  index: string;
  value: number;
  label: string;
  streak?: boolean;
  /** Tappable tiles open what they count (Saved → the saved words). */
  onPress?: () => void;
}) {
  const ground = useGround();
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.tile,
        second && styles.tileSecond,
        { borderColor: ground.hairline },
        pressed && styles.pressed,
      ]}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label.toLowerCase()}${onPress ? '. Opens the list.' : ''}`}
    >
      <View style={styles.tileTop}>
        <Mono size={11} tone="faint">
          {index}
        </Mono>
        {streak && value > 0 && <PlanetDot wordType="wanderword" glow breathing />}
      </View>
      <Headline accessibilityRole="text" size={56} style={styles.tileValue}>
        {value}
      </Headline>
      <Eyebrow tone="muted" style={styles.centeredText}>{label}</Eyebrow>
    </Pressable>
  );
}

function LinkRow({
  eyebrow,
  title,
  aside,
  glyph,
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  compact = false,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
  glyph: 'forward' | 'leaves';
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'link';
  /** Half width, side by side with another compact row. */
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [compact && styles.compact, pressed && styles.pressed]}
    >
      <Panel style={[styles.linkRow, compact && styles.linkRowCompact]}>
        <View style={styles.linkCopy}>
          <Eyebrow style={styles.centeredText} numberOfLines={1} adjustsFontSizeToFit>{eyebrow}</Eyebrow>
          <Headline
            accessibilityRole="text"
            size={compact ? 19 : 26}
            style={styles.centeredText}
            numberOfLines={compact ? 1 : undefined}
            adjustsFontSizeToFit={compact}
            minimumFontScale={0.7}
          >
            {title}
          </Headline>
        </View>
        {aside !== undefined && <Headline accessibilityRole="text" size={26} style={styles.centeredText}>{aside}</Headline>}
        <Glyph name={glyph} size={compact ? 16 : 20} />
      </Panel>
    </Pressable>
  );
}

function WidgetShowcase({ onOpen }: { onOpen: (variant: WidgetGuideVariant) => void }) {
  const ground = useGround();
  return (
    <View style={styles.section}>
      <Eyebrow tone="muted" style={styles.centeredText}>03 / Widgets</Eyebrow>
      <Rule style={styles.sectionRule} />
      <View style={styles.widgetCards}>
        {(Platform.OS === 'ios' ? (['home', 'lock'] as const) : (['home'] as const)).map((variant) => (
          <Pressable
            key={variant}
            onPress={() => onOpen(variant)}
            accessibilityRole="button"
            accessibilityLabel={
              variant === 'home' ? 'How to add the Home Screen widget' : 'How to add the Lock Screen widget'
            }
            style={({ pressed }) => [styles.widgetCard, { borderColor: ground.hairline }, pressed && styles.pressed]}
          >
            <WidgetPreview variant={variant} size={108} />
            <Eyebrow tone="default" style={styles.widgetLabel}>
              {variant === 'home' ? 'Home Screen' : 'Lock Screen'}
            </Eyebrow>
            <Mono size={11} tone="muted">
              {variant === 'home' ? 'Configure ↗' : 'Learn how ↗'}
            </Mono>
          </Pressable>
        ))}
      </View>
      <Panel style={styles.widgetSettings}>
        {[
          ['Topics', 'Mix'],
          ...(Platform.OS === 'ios' ? [['Themes', 'Word color · Night sky · Rose · Nature']] : []),
          ['Refresh', 'Daily at midnight'],
        ].map(([label, value], index) => (
          <View
            key={label}
            style={[styles.settingRow, index > 0 && { borderTopColor: ground.hairline, borderTopWidth: 1 }]}
            accessible
          >
            <Body size={17}>{label}</Body>
            <Mono size={12} tone="muted" style={styles.settingValue}>
              {value}
            </Mono>
          </View>
        ))}
      </Panel>
    </View>
  );
}

/**
 * Notification times live here, where people look for "my settings": turn
 * them on, change the time, or add more times a day (up to four).
 */
function NotificationsSection() {
  const notifEnabled = useUserStore((s) => s.notifEnabled);
  const setNotifEnabled = useUserStore((s) => s.setNotifEnabled);
  const notifTime = useUserStore((s) => s.notifTime);
  const extraNotifTimes = useUserStore((s) => s.extraNotifTimes);
  const setNotifTimes = useUserStore((s) => s.setNotifTimes);
  const times = useMemo(() => sortedNotifTimes([notifTime, ...extraNotifTimes]), [notifTime, extraNotifTimes]);
  const [busy, setBusy] = useState(false);

  const turnOn = async () => {
    setBusy(true);
    try {
      const granted = await requestPermission('stats');
      setNotifEnabled(granted);
      if (granted) successHaptic();
      else
        Alert.alert('Notifications are off', 'Enable Emotionary notifications in system settings.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => void Linking.openSettings() },
        ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Eyebrow tone="muted" style={styles.centeredText}>02 / Notifications</Eyebrow>
      <Rule style={styles.sectionRule} />
      {notifEnabled ? (
        <View style={styles.notifications}>
          <NotificationTimes
            times={times}
            onChange={setNotifTimes}
            picker="onDemand"
            hint="Add a time for every part of your day: morning coffee, a lunch break, a quiet night."
          />
        </View>
      ) : (
        <View style={styles.notifications}>
          <Body tone="muted" size={16} style={styles.notificationsLead}>
            Notifications are off. Turn them on to get your word each day, at the times you choose.
          </Body>
          <Button label="Turn on notifications" onPress={() => void turnOn()} busy={busy} />
        </View>
      )}
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
    <Screen ground="ink">
      <OrbitBackdrop top={-20} />
      <StatsBurst burstKey={burstKey} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Eyebrow style={styles.centeredText}>Your emotionary</Eyebrow>
          <IconButton
            glyph="menu"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            style={styles.settings}
          />
        </View>
        <Headline size={52} style={styles.centeredText}>Your stats.</Headline>
        <Body tone="muted" style={styles.lead}>
          {allZero ? 'Your streak starts today. Read your first word.' : 'A small window into language, every day.'}
        </Body>

        <View style={styles.section}>
          <Eyebrow tone="muted" style={styles.centeredText}>01 / Practice</Eyebrow>
          <Rule style={styles.sectionRule} />
          <View style={styles.grid}>
            <StatTile index="01" value={streak} label="Day streak" streak />
            <StatTile index="02" value={readCount} label="Words read" second />
            <StatTile
              index="03"
              value={favorites.length}
              label="Saved"
              onPress={() => router.push('/favorites' as Href)}
            />
            <StatTile index="04" value={sharedCount} label="Shared" second />
          </View>
        </View>

        <NotificationsSection />

        <View style={styles.links}>
          <LinkRow
            eyebrow="Saved words"
            title="Your word collection"
            aside={String(favorites.length)}
            glyph="forward"
            onPress={() => router.push('/favorites' as Href)}
            accessibilityLabel={`Saved words, ${favorites.length} saved. Opens the list.`}
          />
          <View style={styles.linkPair}>
            <LinkRow
              compact
              eyebrow="Know someone?"
              title="Share with a friend"
              glyph="leaves"
              onPress={() =>
                void shareInvite().then((shared) => {
                  if (!shared) return;
                  successHaptic();
                  trackInvite('shared', 'stats');
                })
              }
              accessibilityLabel="Share Emotionary with a friend. Opens the share sheet."
            />
            <LinkRow
              compact
              eyebrow="Follow along"
              title="@emotionarybook"
              glyph="leaves"
              accessibilityRole="link"
              onPress={() => void Linking.openURL(INSTAGRAM_URL)}
              accessibilityLabel="Follow Emotionary on Instagram. Opens Instagram."
            />
          </View>
        </View>

        <WidgetShowcase
          onOpen={(variant) => {
            selectionHaptic();
            setWidgetGuide(variant);
          }}
        />

        <View style={styles.book}>
          <View style={styles.bookCopy}>
            <Eyebrow style={styles.centeredText}>The book</Eyebrow>
            <Headline size={34} style={styles.centeredText}>A dictionary of emotions.</Headline>
          </View>
          <RoundCta
            label={'Get the\nbook'}
            onPress={() => void Linking.openURL(BOOK_URL)}
            accessibilityHint="Opens emotionarybook.com"
          />
        </View>
      </ScrollView>

      <WidgetGuideModal
        variant={widgetGuide ?? 'home'}
        visible={widgetGuide !== null}
        onClose={() => setWidgetGuide(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: layout.gutter, paddingBottom: 120 },
  headerRow: {
    minHeight: layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.s,
  },
  settings: { position: 'absolute', right: -10 },
  centeredText: { textAlign: 'center' },
  lead: { marginTop: space.s, maxWidth: 300, alignSelf: 'center', textAlign: 'center' },
  section: { marginTop: space.xl },
  sectionRule: { marginTop: space.s },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    width: '50%',
    borderBottomWidth: 1,
    paddingVertical: space.m,
    paddingHorizontal: space.m,
    alignItems: 'center',
    gap: 2,
  },
  tileSecond: { borderLeftWidth: 1 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  tileValue: { fontFamily: font.display, letterSpacing: tracking(56, -0.05) },
  links: { gap: space.s, marginTop: space.xl },
  notifications: { gap: space.m, marginTop: space.m, alignItems: 'center' },
  notificationsLead: { maxWidth: 320, textAlign: 'center' },
  linkRow: {
    minHeight: 76,
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.m,
    paddingVertical: space.m,
  },
  linkCopy: { gap: 2, alignItems: 'center' },
  pressed: { opacity: 0.7 },
  linkPair: { flexDirection: 'row', gap: space.s },
  compact: { flex: 1 },
  linkRowCompact: { minHeight: 0, flex: 1, paddingHorizontal: space.s, paddingVertical: space.m },
  widgetCards: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  widgetCard: { flex: 1, borderWidth: 1, alignItems: 'center', paddingVertical: space.l, gap: 4 },
  widgetLabel: { marginTop: space.m },
  widgetSettings: { marginTop: space.s },
  settingRow: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
  },
  settingValue: { flexShrink: 1, textAlign: 'center' },
  book: {
    alignItems: 'center',
    gap: space.s,
    marginTop: space.xxl,
  },
  bookCopy: { gap: space.s, alignItems: 'center' },
});
