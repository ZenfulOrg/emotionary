import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Body,
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
import { StatsBurst } from '@/components/stats-burst';
import { WidgetGuideModal, type WidgetGuideVariant } from '@/components/WidgetGuideModal';
import { WidgetPreview } from '@/components/WidgetPreview';
import { mediumImpactHaptic, selectionHaptic } from '@/feedback/haptics';
import { STATS_OPEN_EVENT } from '@/stats/events';
import { useUserStore } from '@/store/userStore';
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
}: {
  second?: boolean;
  index: string;
  value: number;
  label: string;
  streak?: boolean;
}) {
  const ground = useGround();
  return (
    <View
      style={[styles.tile, second && styles.tileSecond, { borderColor: ground.hairline }]}
      accessible
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
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
      <Eyebrow tone="muted">{label}</Eyebrow>
    </View>
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
}: {
  eyebrow: string;
  title: string;
  aside?: string;
  glyph: 'forward' | 'leaves';
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'link';
}) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Panel style={styles.linkRow}>
        <View style={styles.linkCopy}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Headline accessibilityRole="text" size={26}>
            {title}
          </Headline>
        </View>
        {aside !== undefined && <Headline accessibilityRole="text" size={26}>{aside}</Headline>}
        <Glyph name={glyph} size={20} />
      </Panel>
    </Pressable>
  );
}

function WidgetShowcase({ onOpen }: { onOpen: (variant: WidgetGuideVariant) => void }) {
  const ground = useGround();
  return (
    <View style={styles.section}>
      <Eyebrow tone="muted">02 / Widgets</Eyebrow>
      <Rule style={styles.sectionRule} />
      <View style={styles.widgetCards}>
        {(['home', 'lock'] as const).map((variant) => (
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
          ['Themes', 'Word color · Night sky · Rose · Nature'],
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
          <Eyebrow>Your emotionary</Eyebrow>
          <IconButton
            glyph="menu"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            style={styles.settings}
          />
        </View>
        <Headline size={52}>Your stats.</Headline>
        <Body tone="muted" style={styles.lead}>
          {allZero ? 'Your streak starts today. Read your first word.' : 'A small window into language, every day.'}
        </Body>

        <View style={styles.section}>
          <Eyebrow tone="muted">01 / Practice</Eyebrow>
          <Rule style={styles.sectionRule} />
          <View style={styles.grid}>
            <StatTile index="01" value={streak} label="Day streak" streak />
            <StatTile index="02" value={readCount} label="Words read" second />
            <StatTile index="03" value={favorites.length} label="Saved" />
            <StatTile index="04" value={sharedCount} label="Shared" second />
          </View>
        </View>

        <View style={styles.links}>
          <LinkRow
            eyebrow="Saved words"
            title="Words to keep close"
            aside={String(favorites.length)}
            glyph="forward"
            onPress={() => router.push('/favorites' as Href)}
            accessibilityLabel={`Saved words, ${favorites.length} saved. Opens the list.`}
          />
          <LinkRow
            eyebrow="Follow along"
            title="@emotionarybook"
            glyph="leaves"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(INSTAGRAM_URL)}
            accessibilityLabel="Follow Emotionary on Instagram. Opens Instagram."
          />
        </View>

        <WidgetShowcase
          onOpen={(variant) => {
            selectionHaptic();
            setWidgetGuide(variant);
          }}
        />

        <View style={styles.book}>
          <View style={styles.bookCopy}>
            <Eyebrow>The book</Eyebrow>
            <Headline size={34}>A dictionary of emotions.</Headline>
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
    justifyContent: 'space-between',
    marginTop: space.s,
  },
  settings: { marginRight: -10 },
  lead: { marginTop: space.s, maxWidth: 300 },
  section: { marginTop: space.xl },
  sectionRule: { marginTop: space.s },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    width: '50%',
    borderBottomWidth: 1,
    paddingVertical: space.m,
    paddingRight: space.m,
    gap: 2,
  },
  tileSecond: { borderLeftWidth: 1, paddingLeft: space.m, paddingRight: 0 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileValue: { fontFamily: font.display, letterSpacing: tracking(56, -0.05) },
  links: { gap: space.s, marginTop: space.xl },
  linkRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.m,
    paddingVertical: space.m,
  },
  linkCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  widgetCards: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  widgetCard: { flex: 1, borderWidth: 1, alignItems: 'center', paddingVertical: space.l, gap: 4 },
  widgetLabel: { marginTop: space.m },
  widgetSettings: { marginTop: space.s },
  settingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.m,
    paddingHorizontal: space.m,
  },
  settingValue: { flexShrink: 1, textAlign: 'right' },
  book: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    marginTop: space.xxl,
  },
  bookCopy: { flex: 1, gap: space.s },
});
