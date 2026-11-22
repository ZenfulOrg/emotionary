import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeOut } from 'react-native-reanimated';
import {
  AppState,
  FlatList,
  Linking,
  Platform,
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
import { InvitePrompt } from '@/components/InvitePrompt';
import { shareInvite } from '@/invite/invite';
import { INVITE_EYEBROW, nextInviteMoment, type InviteMoment } from '@/invite/schedule';
import { trackInvite } from '@/invite/track';
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
import { STREAK_MILESTONES, track } from '@/analytics/track';

/** How long a word's meaning must be on screen to count as read. */
const READ_AFTER_MS = 1500;

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
/** Quiet time on Today before the share-with-a-friend pop-up appears. */
const INVITE_SETTLE_MS = 700;

/** The streak popup shows once per app launch, on the first open of Today. */
let streakPopupShownThisSession = false;
let notificationPromptHandledThisSession = false;
/** Lets a screen change finish before a notification/widget celebration plays. */
const CELEBRATION_SETTLE_MS = 350;
/** The streak card mounts this long into a celebration (it then drops in). */
const CELEBRATION_STREAK_MOUNT_MS = 600;
/** The last notification/widget celebration Today played (one per tap). */
let handledCelebrationRun = 0;

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
  const welcomeDate = useUserStore((s) => s.welcomeDate);
  const feedScrolled = useUserStore((s) => s.feedScrolled);
  const markFeedScrolled = useUserStore((s) => s.markFeedScrolled);
  const listRef = useRef<FlatList<TodayFeedItem>>(null);
  const kept = useKeptSlugs();
  const [feedHeight, setFeedHeight] = useState(0);
  const [visibleSlug, setVisibleSlug] = useState<string | null>(null);
  const [streakVisible, setStreakVisible] = useState(() => !streakPopupShownThisSession);
  /** How far into the reveal the streak card mounted (celebrations mount it late). */
  const [streakMountDelay, setStreakMountDelay] = useState(0);
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

  const [today, setToday] = useState(localDateString);
  const markRevealed = useUserStore((s) => s.markRevealed);
  // First open of the day, and right after signing in: play the reveal
  // (sparkle, staggered word, a soft haptic as it lands, then the streak).
  // Checked whenever Today is shown or the app comes back to the front, so it
  // also plays when the app was left open overnight. Later opens are calm.
  const [revealing, setRevealing] = useState(() => useUserStore.getState().lastRevealDate !== today);
  // Confetti greets every open of the app on Today (a cold start, or coming
  // back from the background), as well as the reveal and celebrations.
  const [burstVisible, setBurstVisible] = useState(true);
  /** Bumped to replay the confetti from the start. */
  const [burstRun, setBurstRun] = useState(1);
  const playBurst = useCallback(() => {
    setBurstVisible(true);
    setBurstRun((run) => run + 1);
  }, []);
  useEffect(() => {
    if (!burstVisible) return;
    const timer = setTimeout(() => setBurstVisible(false), REVEAL_BURST_MS);
    return () => clearTimeout(timer);
  }, [burstVisible, burstRun]);
  const todayFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      todayFocused.current = true;
      return () => {
        todayFocused.current = false;
      };
    }, []),
  );
  /** Bumped per reveal: remounts the first card so its entrance plays again. */
  const [revealRun, setRevealRun] = useState(0);
  /** A reveal that is starting but not yet marked as played (avoids a double start). */
  const revealPending = useRef<string | null>(revealing ? today : null);
  const checkReveal = useCallback(() => {
    const now = localDateString();
    setToday(now);
    if (useUserStore.getState().lastRevealDate === now || revealPending.current === now) return;
    revealPending.current = now;
    setRevealing(true);
    playBurst();
    setRevealRun((run) => run + 1);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [playBurst]);
  useFocusEffect(checkReveal);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      // Back from the background counts as an open; a pulled-down
      // notification centre ('inactive') does not.
      if (state === 'active' && previous === 'background' && todayFocused.current) playBurst();
      if (state === 'active') checkReveal();
      previous = state;
    });
    return () => subscription.remove();
  }, [checkReveal, playBurst]);
  useEffect(() => {
    if (!revealing) return;
    markRevealed(localDateString());
    revealPending.current = null;
    const timers = [
      setTimeout(lightImpactHaptic, REVEAL_LAND_MS),
      setTimeout(lightImpactHaptic, REVEAL_LAND_MS + 130),
    ];
    return () => timers.forEach(clearTimeout);
  }, [revealing, revealRun, markRevealed]);

  // The popup belongs to Today: leaving (e.g. the unlock sheet) closes it so it
  // can't catch taps meant for the screen on top.
  useFocusEffect(useCallback(() => dismissStreak, [dismissStreak]));

  // Read words go to the back of the scroll. Snapshotted once per day so
  // reading doesn't reshuffle the feed under someone's thumb.
  const seen = useMemo(
    () => new Set(useUserStore.getState().readSlugs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  );
  // Opened from a notification or the widget: that word leads Today.
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);
  const baseFeed = useMemo(
    () => buildTodayFeed(words, today, hasFullAccess, cycleCount, welcomeDate, seen),
    [words, today, hasFullAccess, cycleCount, welcomeDate, seen],
  );
  const feed = useMemo(() => pinToFront(baseFeed, pinnedSlug), [baseFeed, pinnedSlug]);
  // Admin-controlled, so count live instead of assuming ten.
  const freeCount = useMemo(() => freeWords(words).length, [words]);
  // Today's own word stays the free one, wherever a pinned word moved it.
  const firstFeedSlug = baseFeed[0]?.kind === 'word' ? baseFeed[0].word.slug : null;
  // Until someone has swiped once, Today's first word says more wait below.
  const wordsBelow = feed.filter((item) => item.kind === 'word').length - 1;
  // A notification or widget tap brings the cue back once, even for people
  // who already know to swipe.
  const [celebrationHint, setCelebrationHint] = useState(false);
  const scrollHintLabel =
    (feedScrolled && !celebrationHint) || feed.length < 2
      ? null
      : hasFullAccess
        ? celebrationHint
          ? 'Keep scrolling for more words'
          : 'Swipe up for more words'
        : `${wordsBelow} free ${wordsBelow === 1 ? 'word' : 'words'} below`;
  // A tap on the daily notification or the widget opens Today on that word
  // with the full welcome: confetti, a haptic as it lands, the streak drop-in
  // and the scroll cue, even if today's reveal already played.
  const playCelebration = useCallback(() => {
    const { celebrateRun, celebrateSlug, clearCelebration } = useUserStore.getState();
    if (celebrateRun === 0 || celebrateRun === handledCelebrationRun) return;
    handledCelebrationRun = celebrateRun;
    clearCelebration();
    setPinnedSlug(celebrateSlug);
    setToday(localDateString());
    revealPending.current = null;
    setRevealing(true);
    playBurst();
    setRevealRun((run) => run + 1);
    setCelebrationHint(true);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setTimeout(successHaptic, REVEAL_LAND_MS);
    // Mounted a beat later: a drop-in that starts while the screen change is
    // still animating never shows.
    setTimeout(() => {
      streakPopupShownThisSession = false;
      setStreakMountDelay(CELEBRATION_STREAK_MOUNT_MS);
      setStreakVisible(true);
    }, CELEBRATION_STREAK_MOUNT_MS);
  }, [playBurst]);
  // Played only while Today is on screen: a tap that arrives while another
  // screen is open waits until Today is shown again.
  const celebrationFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      celebrationFocused.current = true;
        // A tap from a cold start (or from another screen) is already waiting.
      // The short wait lets the screen change that brought Today back finish.
      const pending = setTimeout(playCelebration, CELEBRATION_SETTLE_MS);
      return () => {
        celebrationFocused.current = false;
            clearTimeout(pending);
      };
    }, [playCelebration]),
  );
  useEffect(
    () =>
      useUserStore.subscribe((state, previous) => {
        if (state.celebrateRun === previous.celebrateRun) return;
        // A deep link opens its own screen first and Today only blurs a moment
        // later, so check focus again once that has settled; if Today is not
        // showing then, the focus effect plays it when Today comes back.
        setTimeout(() => {
          if (celebrationFocused.current) playCelebration();
        }, CELEBRATION_SETTLE_MS);
      }),
    [playCelebration],
  );

  const scrollToNext = useCallback(() => {
    listRef.current?.scrollToIndex({ index: 1, animated: true });
  }, []);
  const activeAudioSlug = feed.some(
    (item) => item.kind === 'word' && item.word.slug === visibleSlug,
  )
    ? visibleSlug
    : firstFeedSlug;

  useEffect(() => {
    visibleSlugRef.current = activeAudioSlug;
  }, [activeAudioSlug]);

  // "Words read" counts a word once its meaning has been on screen for a
  // moment: not when it flicks past, and not while its meaning is locked.
  const [isFocused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    if (!isFocused || !activeAudioSlug) return;
    const item = feed.find((entry) => entry.kind === 'word' && entry.word.slug === activeAudioSlug);
    if (item?.kind !== 'word') return;
    if (wordAccess(item.word, firstFeedSlug, hasFullAccess, kept) !== 'full') return;
    const timer = setTimeout(() => {
      markRead(activeAudioSlug);
      track('word_viewed', {
        slug: activeAudioSlug,
        word_type: item.word.type,
        is_today: activeAudioSlug === firstFeedSlug,
        where: 'today',
      });
    }, READ_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isFocused, activeAudioSlug, feed, firstFeedSlug, hasFullAccess, kept, markRead]);

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
      const granted = await requestPermission('today');
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
      if (visibleToken && visibleToken.index !== null && visibleToken.index > 0) {
        setCelebrationHint(false);
        // Swipes during the first-visit tips don't count: the cue sits under
        // the tip card there, so it stays until a swipe after the tips.
        const { feedScrolled: scrolled, walkthroughDone: tipsDone } = useUserStore.getState();
        if (!scrolled && tipsDone) markFeedScrolled();
      }
      if (visibleToken?.item.kind === 'word') {
        visibleSlugRef.current = visibleToken.item.word.slug;
        setVisibleSlug(visibleToken.item.word.slug);
        if (
          useUserStore.getState().walkthroughDone &&
          shouldShowTodayActionCoachmark(visibleToken.index, coachmarkSeenRef.current)
        ) {
          showCoachmark();
        }
      }
    },
    [markFeedScrolled, showCoachmark],
  );

  useFocusEffect(
    useCallback(() => {
      const streakBefore = useUserStore.getState().streakState.streak;
      recordOpen(today);
      const streakAfter = useUserStore.getState().streakState.streak;
      if (streakAfter !== streakBefore && (STREAK_MILESTONES as readonly number[]).includes(streakAfter)) {
        track('streak_milestone', { length: streakAfter });
      }
      // A few days in a row is a happy moment to ask for a rating; wait until
      // the reveal and streak popup have played.
      const reviewTimer = isReviewMoment(useUserStore.getState().streakState.streak)
        ? setTimeout(() => void maybeAskForReview(), 6000)
        : null;
      if (feed[0]?.kind === 'word') visibleSlugRef.current = feed[0].word.slug;
      return () => {
        if (reviewTimer) clearTimeout(reviewTimer);
      };
    }, [recordOpen, today, feed]),
  );

  // Share with a friend: after a 7-day streak, the first word card shared and
  // a 30-day streak, within the limits in invite/schedule.ts. It only ever
  // shows when Today is quiet: no confetti, streak card, prompt or tip on
  // screen, and nothing open on top. The invite link shows it on demand.
  const invite = useUserStore((s) => s.invite);
  const inviteRequested = useUserStore((s) => s.inviteRequested);
  const [inviteMoment, setInviteMoment] = useState<InviteMoment | 'requested' | null>(null);
  const todayQuiet =
    isFocused &&
    !burstVisible &&
    !streakVisible &&
    !notificationPromptVisible &&
    !coachmarkVisible &&
    walkthroughDone &&
    promptSettled;
  useEffect(() => {
    if (!todayQuiet || inviteMoment) return;
    const moment = inviteRequested ? 'requested' : nextInviteMoment(invite, today, welcomeDate);
    if (!moment) return;
    // A short breath once Today settles, so it never lands on top of the
    // last thing that just closed.
    const timer = setTimeout(() => {
      setInviteMoment(moment);
      if (moment !== 'requested') useUserStore.getState().markInviteShown(moment, today);
      trackInvite('shown', moment);
    }, INVITE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [todayQuiet, inviteMoment, inviteRequested, invite, today, welcomeDate]);
  const closeInvite = useCallback(() => {
    setInviteMoment(null);
    useUserStore.getState().clearInviteRequest();
  }, []);
  const dismissInvite = useCallback(() => {
    if (inviteMoment && inviteMoment !== 'requested') useUserStore.getState().dismissInvite();
    if (inviteMoment) trackInvite('dismissed', inviteMoment);
    closeInvite();
  }, [closeInvite, inviteMoment]);
  const sendInvite = useCallback(() => {
    const source = inviteMoment;
    closeInvite();
    void shareInvite().then((shared) => {
      if (!shared) return;
      successHaptic();
      if (source) trackInvite('shared', source);
    });
  }, [closeInvite, inviteMoment]);

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
          enterDelay={revealing ? REVEAL_STREAK_DELAY_MS - streakMountDelay : 0}
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
      {inviteMoment && (
        <InvitePrompt eyebrow={INVITE_EYEBROW[inviteMoment]} onShare={sendInvite} onDismiss={dismissInvite} />
      )}
      {/* First visit: after the streak popup and the notification prompt, never on top of them. */}
      {!walkthroughDone && promptSettled && !streakVisible && !notificationPromptVisible && (
        <TodayWalkthrough onDone={completeWalkthrough} />
      )}
      <View style={styles.container} onLayout={onLayout}>
        <FlatList
          ref={listRef}
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
                  key={index === 0 ? `reveal-${revealRun}` : undefined}
                  word={item.word}
                  feedPage
                  pageHeight={feedHeight}
                  eyebrow={index === 0 ? "Today's word" : undefined}
                  reveal={revealing && index === 0}
                  scrollHint={
                    index === 0 && scrollHintLabel
                      ? { label: scrollHintLabel, onPress: scrollToNext }
                      : undefined
                  }
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
          extraData={`${activeAudioSlug}|${hasFullAccess}|${kept.size}|${scrollHintLabel ?? ''}`}
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
          <StatsBurst burstKey={burstRun} />
        </Animated.View>
      )}
    </Screen>
  );
}

/** Moves a word already in the feed to the front (a notification or widget tap). */
function pinToFront(feed: TodayFeedItem[], slug: string | null): TodayFeedItem[] {
  if (!slug) return feed;
  const index = feed.findIndex((item) => item.kind === 'word' && item.word.slug === slug);
  if (index <= 0) return feed;
  return [feed[index], ...feed.slice(0, index), ...feed.slice(index + 1)];
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
            {Platform.OS === 'android'
              ? 'Unlock the full emotional vocabulary dictionary, the origin of every word (its roots, history and cultural background), and future word updates.'
              : 'Unlock the full emotional vocabulary dictionary, the origin of every word (its roots, history and cultural background), every widget theme, and future word updates.'}
          </Body>
        </View>
        <RoundCta
          label={'Get full\naccess'}
          onPress={() => router.push('/paywall?from=today' as Href)}
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
