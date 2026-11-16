import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeOut } from 'react-native-reanimated';
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
import { TodayWalkthrough } from '@/components/TodayWalkthrough';
import { WordFull } from '@/components/WordFull';
import { StreakPopup } from '@/components/StreakPopup';
import { StatsBurst } from '@/components/stats-burst';
import { useContentStore } from '@/content/store';
import { freeWords, wordAccess } from '@/entitlements';
import { useKeptSlugs } from '@/store/useKeptSlugs';
import { localDateString } from '@/daily/engine';
import { buildTodayFeed, type TodayFeedItem } from '@/daily/today-feed';
import { shouldShowTodayActionCoachmark } from '@/daily/tutorial';
import { lightImpactHaptic, mediumImpactHaptic, successHaptic } from '@/feedback/haptics';
import { getPermissionGranted, requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { isReviewMoment, maybeAskForReview } from '@/review/prompt';
import { brand, layout, levelPalettes, space } from '@/theme/tokens';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 70,
  minimumViewTime: 450,
} as const;

/** The word lands this long into the daily reveal; the haptic nudge fires with it. */
const REVEAL_LAND_MS = 520;
/** The streak popup drops in once the word has landed. */
const REVEAL_STREAK_DELAY_MS = 1100;
/** The sparkle fades away after this long. */
const REVEAL_BURST_MS = 3200;

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
  const kept = useKeptSlugs();
  const [feedHeight, setFeedHeight] = useState(0);
  const [visibleSlug, setVisibleSlug] = useState<string | null>(null);
  const [streakVisible, setStreakVisible] = useState(() => !streakPopupShownThisSession);
  const [coachmarkVisible, setCoachmarkVisible] = useState(false);
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  // True once this session's notification-permission check has finished.
  const [promptSettled, setPromptSettled] = useState(notificationPromptHandledThisSession);
  const walkthroughDone = useUserStore((s) => s.walkthroughDone);
  const completeWalkthrough = useUserStore((s) => s.completeWalkthrough);
  const [cycleCount, setCycleCount] = useState(1);
  const coachmarkSeenRef = useRef(todayActionCoachmarkSeen);
  const visibleSlugRef = useRef<string | null>(null);
  const coachmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissStreak = useCallback(() => {
    streakPopupShownThisSession = true;
    setStreakVisible(false);
  }, []);

  const today = localDateString();
  const markRevealed = useUserStore((s) => s.markRevealed);
  // First open of the day: play the reveal once (sparkle, staggered word, a
  // soft haptic as it lands, then the streak). Later opens are calm.
  const [revealing] = useState(() => useUserStore.getState().lastRevealDate !== today);
  const [burstVisible, setBurstVisible] = useState(revealing);
  useEffect(() => {
    if (!revealing) return;
    markRevealed(today);
    const timers = [
      setTimeout(lightImpactHaptic, REVEAL_LAND_MS),
      setTimeout(lightImpactHaptic, REVEAL_LAND_MS + 130),
      setTimeout(() => setBurstVisible(false), REVEAL_BURST_MS),
    ];
    return () => timers.forEach(clearTimeout);
    // Once per mount; `today` is fixed for the reveal that started it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealing]);

  // The popup belongs to Today: leaving (e.g. the unlock sheet) closes it so it
  // can't catch taps meant for the screen on top.
  useFocusEffect(useCallback(() => dismissStreak, [dismissStreak]));

  const feed = useMemo(
    () => buildTodayFeed(words, today, hasFullAccess, cycleCount),
    [words, today, hasFullAccess, cycleCount],
  );
  // Admin-controlled, so count live instead of assuming ten.
  const freeCount = useMemo(() => freeWords(words).length, [words]);
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
      })
      .finally(() => {
        if (!cancelled) setPromptSettled(true);
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
        if (
          useUserStore.getState().walkthroughDone &&
          shouldShowTodayActionCoachmark(visibleToken.index, coachmarkSeenRef.current)
        ) {
          showCoachmark();
        }
      }
    },
    [markRead, showCoachmark],
  );

  useFocusEffect(
    useCallback(() => {
      recordOpen(today);
      // A few days in a row is a happy moment to ask for a rating; wait until
      // the reveal and streak popup have played.
      const reviewTimer = isReviewMoment(useUserStore.getState().streakState.streak)
        ? setTimeout(() => void maybeAskForReview(), 6000)
        : null;
      if (feed[0]?.kind === 'word') {
        visibleSlugRef.current = feed[0].word.slug;
        markRead(feed[0].word.slug);
      }
      return () => {
        if (reviewTimer) clearTimeout(reviewTimer);
      };
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
          enterDelay={revealing ? REVEAL_STREAK_DELAY_MS : 0}
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
      {/* First visit: after the streak popup and the notification prompt, never on top of them. */}
      {!walkthroughDone && promptSettled && !streakVisible && !notificationPromptVisible && (
        <TodayWalkthrough onDone={completeWalkthrough} />
      )}
      <View style={styles.container} onLayout={onLayout}>
        <FlatList
          data={feed}
          keyExtractor={(item) => item.key}
          renderItem={({ item, index }) => (
            <View
              style={[
                feedHeight > 0 ? { height: feedHeight } : styles.page,
                {
                  backgroundColor:
                    item.kind === 'word' ? levelPalettes[item.word.level].tint : brand.ink,
                },
              ]}
            >
              {item.kind === 'word' ? (
                <WordFull
                  word={item.word}
                  feedPage
                  eyebrow={index === 0 ? "Today's word" : undefined}
                  reveal={revealing && index === 0}
                  audioActive={item.word.slug === activeAudioSlug}
                  meaningLocked={
                    wordAccess(item.word, firstFeedSlug, hasFullAccess, kept) === 'teaser'
                  }
                />
              ) : (
                <UpgradeSlide freeCount={freeCount} />
              )}
            </View>
          )}
          pagingEnabled={feedHeight > 0}
          extraData={`${activeAudioSlug}|${hasFullAccess}|${kept.size}`}
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
          onEndReached={hasFullAccess ? () => setCycleCount((current) => current + 1) : undefined}
          onEndReachedThreshold={0.7}
          accessibilityLabel="Daily word feed"
        />
      </View>
      {burstVisible && (
        <Animated.View
          exiting={FadeOut.duration(900)}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <StatsBurst burstKey={1} />
        </Animated.View>
      )}
    </Screen>
  );
}

/** The end of the free feed: a page of ink, the orbit, one round CTA. */
function UpgradeSlide({ freeCount }: { freeCount: number }) {
  return (
    <GroundProvider ground="ink">
      <View style={styles.upgradeSlide}>
        <OrbitBackdrop top="6%" />
        <View style={styles.upgradeCopy}>
          <Eyebrow>
            {freeCount > 0
              ? `Your free collection · ${freeCount} ${freeCount === 1 ? 'word' : 'words'}`
              : 'Your free collection'}
          </Eyebrow>
          <Headline size={44} style={{ textAlign: 'center' }}>
            Keep discovering.
          </Headline>
          <Body tone="muted" style={styles.upgradeBody}>
            Unlock the full emotional vocabulary dictionary, every widget theme, and future word
            updates.
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
