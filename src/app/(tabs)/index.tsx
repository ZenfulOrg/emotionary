import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';

import { Body, Eyebrow, Headline, OrbitBackdrop, RoundCta, Screen } from '@/components/brand';
import { GroundProvider } from '@/theme/ground';
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt';
import { TodayCoachmark } from '@/components/TodayCoachmark';
import { WordFull } from '@/components/WordFull';
import { StreakPopup } from '@/components/StreakPopup';
import { useContentStore } from '@/content/store';
import { localDateString } from '@/daily/engine';
import { buildTodayFeed, type TodayFeedItem } from '@/daily/today-feed';
import { shouldShowTodayActionCoachmark } from '@/daily/tutorial';
import { mediumImpactHaptic, successHaptic } from '@/feedback/haptics';
import { getPermissionGranted, requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { brand, layout, levelPalettes, space } from '@/theme/tokens';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 70,
  minimumViewTime: 450,
} as const;

/** The streak popup shows once per app launch, on the first open of Today. */
let streakPopupShownThisSession = false;
let notificationPromptHandledThisSession = false;

export default function TodayScreen() {
  const words = useContentStore((s) => s.words);
  const recordOpen = useUserStore((s) => s.recordOpen);
  const markRead = useUserStore((s) => s.markRead);
  const streak = useUserStore((s) => s.streakState.streak);
  const streakBrokeDate = useUserStore((s) => s.streakBrokeDate);
  const todayActionCoachmarkSeen = useUserStore((s) => s.todayActionCoachmarkSeen);
  const markTodayActionCoachmarkSeen = useUserStore((s) => s.markTodayActionCoachmarkSeen);
  const setNotifEnabled = useUserStore((s) => s.setNotifEnabled);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const [feedHeight, setFeedHeight] = useState(0);
  const [visibleSlug, setVisibleSlug] = useState<string | null>(null);
  const [streakVisible, setStreakVisible] = useState(() => !streakPopupShownThisSession);
  const [coachmarkVisible, setCoachmarkVisible] = useState(false);
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [cycleCount, setCycleCount] = useState(1);
  const coachmarkSeenRef = useRef(todayActionCoachmarkSeen);
  const visibleSlugRef = useRef<string | null>(null);
  const coachmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissStreak = useCallback(() => {
    streakPopupShownThisSession = true;
    setStreakVisible(false);
  }, []);

  const today = localDateString();
  const feed = useMemo(
    () => buildTodayFeed(words, today, hasFullAccess, cycleCount),
    [words, today, hasFullAccess, cycleCount],
  );
  const firstFeedSlug = feed[0]?.kind === 'word' ? feed[0].word.slug : null;
  const activeAudioSlug = feed.some(
    (item) => item.kind === 'word' && item.word.slug === visibleSlug,
  )
    ? visibleSlug
    : firstFeedSlug;

  useEffect(() => {
    visibleSlugRef.current = activeAudioSlug;
  }, [activeAudioSlug]);

  useEffect(() => {
    coachmarkSeenRef.current = todayActionCoachmarkSeen;
  }, [todayActionCoachmarkSeen]);

  useEffect(
    () => () => {
      if (coachmarkTimer.current) clearTimeout(coachmarkTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (streakVisible || notificationPromptHandledThisSession) return;
    notificationPromptHandledThisSession = true;
    let cancelled = false;

    void getPermissionGranted()
      .then((granted) => {
        if (cancelled) return;
        setNotifEnabled(granted);
        setNotificationPromptVisible(!granted);
      })
      .catch(() => {
        if (!cancelled) setNotificationPromptVisible(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setNotifEnabled, streakVisible]);

  const dismissCoachmark = useCallback(() => {
    if (coachmarkTimer.current) clearTimeout(coachmarkTimer.current);
    coachmarkTimer.current = null;
    setCoachmarkVisible(false);
  }, []);

  const openCoachmarkShare = useCallback(() => {
    const slug =
      visibleSlugRef.current ?? (feed[0]?.kind === 'word' ? feed[0].word.slug : undefined);
    if (slug) router.push(`/share/${slug}` as Href);
    dismissCoachmark();
  }, [dismissCoachmark, feed]);

  const showCoachmark = useCallback(() => {
    if (coachmarkSeenRef.current) return;
    coachmarkSeenRef.current = true;
    markTodayActionCoachmarkSeen();
    mediumImpactHaptic();
    setCoachmarkVisible(true);
    coachmarkTimer.current = setTimeout(dismissCoachmark, 7000);
  }, [dismissCoachmark, markTodayActionCoachmarkSeen]);

  const dismissNotificationPrompt = useCallback(() => {
    setNotificationPromptVisible(false);
  }, []);

  const enableNotifications = useCallback(async () => {
    setNotificationBusy(true);
    try {
      const granted = await requestPermission();
      setNotifEnabled(granted);
      if (granted) {
        successHaptic();
      } else {
        await Linking.openSettings().catch(() => {});
      }
      setNotificationPromptVisible(false);
    } finally {
      setNotificationBusy(false);
    }
  }, [setNotifEnabled]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setFeedHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<TodayFeedItem>[] }) => {
      const visibleToken = viewableItems.find((token) => token.isViewable);
      if (visibleToken?.item.kind === 'word') {
        visibleSlugRef.current = visibleToken.item.word.slug;
        setVisibleSlug(visibleToken.item.word.slug);
        markRead(visibleToken.item.word.slug);
        if (shouldShowTodayActionCoachmark(visibleToken.index, coachmarkSeenRef.current)) {
          showCoachmark();
        }
      }
    },
    [markRead, showCoachmark],
  );

  useFocusEffect(
    useCallback(() => {
      recordOpen(today);
      if (feed[0]?.kind === 'word') {
        visibleSlugRef.current = feed[0].word.slug;
        markRead(feed[0].word.slug);
      }
    }, [recordOpen, markRead, today, feed]),
  );

  if (feed.length === 0) {
    return (
      <Screen style={styles.empty}>
        <Body tone="muted">No words yet. Check back soon.</Body>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      {streakVisible && (
        <StreakPopup
          streak={Math.max(streak, 1)}
          wilted={streakBrokeDate === today}
          onDismiss={dismissStreak}
        />
      )}
      {notificationPromptVisible && (
        <NotificationPermissionPrompt
          busy={notificationBusy}
          onEnable={() => void enableNotifications()}
          onDismiss={dismissNotificationPrompt}
        />
      )}
      {coachmarkVisible && <TodayCoachmark onOpenShare={openCoachmarkShare} />}
      <View style={styles.container} onLayout={onLayout}>
        <FlatList
          data={feed}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={[
              feedHeight > 0 ? { height: feedHeight } : styles.page,
              { backgroundColor: item.kind === 'word' ? levelPalettes[item.word.level].tint : brand.ink },
            ]}>
              {item.kind === 'word' ? (
                <WordFull
                  word={item.word}
                  feedPage
                  audioActive={item.word.slug === activeAudioSlug}
                />
              ) : (
                <UpgradeSlide />
              )}
            </View>
          )}
          pagingEnabled={feedHeight > 0}
          extraData={activeAudioSlug}
          decelerationRate="fast"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          getItemLayout={
            feedHeight > 0
              ? (_, index) => ({ length: feedHeight, offset: feedHeight * index, index })
              : undefined
          }
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          onEndReached={
            hasFullAccess
              ? () => setCycleCount((current) => current + 1)
              : undefined
          }
          onEndReachedThreshold={0.7}
          accessibilityLabel="Daily word feed"
        />
      </View>
    </Screen>
  );
}

/** The end of the free feed: a page of ink, the orbit, one round CTA. */
function UpgradeSlide() {
  return (
    <GroundProvider ground="ink">
      <View style={styles.upgradeSlide}>
        <OrbitBackdrop top="6%" />
        <View style={styles.upgradeCopy}>
          <Eyebrow>Your free collection · 10 words</Eyebrow>
          <Headline size={44} style={{ textAlign: 'center' }}>Keep discovering.</Headline>
          <Body tone="muted" style={styles.upgradeBody}>
            Unlock thousands of unique words, more widget themes, and new words every month.
          </Body>
        </View>
        <RoundCta
          label={'Get full\naccess'}
          onPress={() => router.push('/paywall' as Href)}
          accessibilityHint="Opens Emotionary full access plans"
        />
      </View>
    </GroundProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center' },
  upgradeSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xl,
    backgroundColor: brand.ink,
    paddingHorizontal: layout.gutter,
    overflow: 'hidden',
  },
  upgradeCopy: { gap: space.m, alignItems: 'center' },
  upgradeBody: { maxWidth: 320, textAlign: 'center' },
});
