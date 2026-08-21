import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt';
import { TodayCoachmark } from '@/components/TodayCoachmark';
import { WordFull } from '@/components/WordFull';
import { StreakPopup } from '@/components/StreakPopup';
import type { Word } from '@/content/types';
import { useContentStore } from '@/content/store';
import { localDateString } from '@/daily/engine';
import { dailyFeed } from '@/daily/feed';
import { shouldShowTodayActionCoachmark } from '@/daily/tutorial';
import { canViewWord } from '@/entitlements';
import { mediumImpactHaptic, successHaptic } from '@/feedback/haptics';
import { getPermissionGranted, requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color, font, levelPalettes, type } from '@/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [visibleLevel, setVisibleLevel] = useState<Word['level']>(1);
  const [streakVisible, setStreakVisible] = useState(() => !streakPopupShownThisSession);
  const [coachmarkVisible, setCoachmarkVisible] = useState(false);
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const coachmarkSeenRef = useRef(todayActionCoachmarkSeen);
  const visibleSlugRef = useRef<string | null>(null);
  const coachmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissStreak = useCallback(() => {
    streakPopupShownThisSession = true;
    setStreakVisible(false);
  }, []);

  const today = localDateString();
  const feed = useMemo(() => {
    const all = dailyFeed(words, today);
    const todaysSlug = all[0]?.slug ?? null;
    return hasFullAccess
      ? all
      : all.filter((word) => canViewWord(word, todaysSlug, false));
  }, [words, today, hasFullAccess]);

  useEffect(() => {
    visibleSlugRef.current = feed[0]?.slug ?? null;
  }, [feed]);

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
    const slug = visibleSlugRef.current ?? feed[0]?.slug;
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
    ({ viewableItems }: { viewableItems: ViewToken<Word>[] }) => {
      const visibleToken = viewableItems.find((token) => token.isViewable);
      if (visibleToken?.item) {
        visibleSlugRef.current = visibleToken.item.slug;
        markRead(visibleToken.item.slug);
        setVisibleLevel(visibleToken.item.level);
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
      if (feed[0]) {
        visibleSlugRef.current = feed[0].slug;
        markRead(feed[0].slug);
      }
    }, [recordOpen, markRead, today, feed]),
  );

  if (feed.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No words yet. Check back soon.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: levelPalettes[visibleLevel].tint }]}
      edges={['top']}
    >
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
          keyExtractor={(word) => word.slug}
          renderItem={({ item }) => (
            <View style={feedHeight > 0 ? { height: feedHeight } : styles.page}>
              <WordFull word={item} feedPage insideSafeArea />
            </View>
          )}
          pagingEnabled={feedHeight > 0}
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
          accessibilityLabel="Daily word feed"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  container: { flex: 1 },
  page: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
  emptyText: { fontFamily: font.serif, fontSize: type.body, color: color.inkMuted },
});
