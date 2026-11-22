import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import { DMMono_300Light, DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { type Href, router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useAppConfigStore, useUpdatePrompt } from '@/app-config/store';
import { checkAppleCredential, refreshComplimentaryAccess } from '@/auth/client';
import { syncMarketingConsent } from '@/auth/marketing';
import { UpdateAvailableDialog, UpdateRequiredScreen } from '@/components/UpdatePrompt';
import { findWord, useContentStore } from '@/content/store';
import { canBrowseWord, slugsToKeep } from '@/entitlements';
import { configureNotificationHandler, rebuildQueue } from '@/notifications/scheduler';
import { linkPurchasesToAccount } from '@/purchases/account';
import { observePurchases, refreshPurchases } from '@/purchases/client';
import { useUserStore, whenAccessResolved } from '@/store/userStore';
import { brand } from '@/theme/tokens';
import { notificationTarget } from '@/notifications/tap';
import { reportDeviceStatus } from '@/telemetry/deviceStatus';
import { refreshDailyWordWidget } from '@/widgets/timeline';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    DMMono_300Light,
    DMMono_400Regular,
  });

  const contentHydrated = useContentStore((s) => s.hydrated);
  const hydrate = useContentStore((s) => s.hydrate);
  const sync = useContentStore((s) => s.sync);
  const words = useContentStore((s) => s.words);

  const [userHydrated, setUserHydrated] = useState(useUserStore.persist.hasHydrated());
  const onboarded = useUserStore((s) => s.onboarded);
  const welcomeDate = useUserStore((s) => s.welcomeDate);
  const notifTime = useUserStore((s) => s.notifTime);
  const extraNotifTimes = useUserStore((s) => s.extraNotifTimes);
  const notifEnabled = useUserStore((s) => s.notifEnabled);
  const streakState = useUserStore((s) => s.streakState);
  const favorites = useUserStore((s) => s.favorites);
  const readSlugs = useUserStore((s) => s.readSlugs);
  const keptSlugs = useUserStore((s) => s.keptSlugs);
  const keptLegacyDone = useUserStore((s) => s.keptLegacyDone);
  const contentVerified = useContentStore((s) => s.verified);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const accessResolved = useUserStore((s) => s.accessResolved);

  useEffect(() => useUserStore.persist.onFinishHydration(() => setUserHydrated(true)), []);

  // Remote app settings (update prompts): cached value first, then refresh.
  const updatePrompt = useUpdatePrompt();
  useEffect(() => {
    const { hydrate: hydrateConfig, refresh } = useAppConfigStore.getState();
    void hydrateConfig().then(refresh);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const stop = observePurchases();
    // Existing sign-ins (and installs from before accounts owned purchases)
    // get their store purchases tied to the account once per launch.
    void linkPurchasesToAccount();
    const refresh = () => {
      void refreshPurchases()
        .catch(() => {})
        .finally(() => useUserStore.getState().markAccessResolved());
      void refreshComplimentaryAccess();
    };
    refresh();
    // Never let a hung store check hold up notifications for long.
    const resolveFallback = setTimeout(() => useUserStore.getState().markAccessResolved(), 8_000);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    // Also catch a subscription expiring while the app stays open.
    const timer = setInterval(refresh, 60_000);
    return () => {
      stop();
      foreground.remove();
      clearInterval(timer);
      clearTimeout(resolveFallback);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let disposed = false;
    let removeAppleListener: (() => void) | undefined;
    const check = () => { void checkAppleCredential().then((revoked) => {
      if (revoked && !disposed) router.replace('/account');
    }); };
    void import('expo-apple-authentication').then((Apple) => {
      if (disposed) return;
      const listener = Apple.addRevokeListener(check);
      removeAppleListener = () => listener.remove();
      check();
    });
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => { disposed = true; removeAppleListener?.(); foreground.remove(); };
  }, []);

  // Free users keep words they read or saved while those words were free, so
  // changing the free list in the admin panel never takes a word away.
  useEffect(() => {
    if (!userHydrated || !contentHydrated) return;
    const { add, legacyDone } = slugsToKeep({
      words,
      readSlugs,
      favorites,
      kept: keptSlugs,
      legacyDone: keptLegacyDone,
      contentVerified,
    });
    if (add.length > 0 || legacyDone !== keptLegacyDone) {
      useUserStore.getState().keepSlugs(add, legacyDone);
    }
  }, [userHydrated, contentHydrated, words, readSlugs, favorites, keptSlugs, keptLegacyDone, contentVerified]);

  // Boot: load cached content, then check for new words.
  useEffect(() => {
    void hydrate().then(() => void sync());
  }, [hydrate, sync]);

  // Foreground: probe for content changes (DESIGN.md §6.3).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => sub.remove();
  }, [sync]);

  // Rebuild the notification queue whenever its inputs change — words synced,
  // time changed, toggle flipped, or a fresh foreground (DESIGN.md §8).
  useEffect(() => {
    // Wait for this launch's purchase check so paid users never get teasers.
    if (!userHydrated || !contentHydrated || !onboarded || !accessResolved) return;
    const args = {
      words,
      time: notifTime,
      extraTimes: extraNotifTimes,
      enabled: notifEnabled,
      streakState,
      hasFullAccess,
      kept: keptSlugs,
      welcomeDate,
    };
    void rebuildQueue(args);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void rebuildQueue(args);
    });
    return () => sub.remove();
  }, [userHydrated, contentHydrated, onboarded, accessResolved, words, notifTime, extraNotifTimes, notifEnabled, streakState, hasFullAccess, keptSlugs, welcomeDate]);

  // Keep the widget timeline current — including the like state on today's
  // word, so the widget heart fills as soon as a word is favorited.
  // Seed it during onboarding too: the widget guide appears before signup.
  useEffect(() => {
    if (!userHydrated || !contentHydrated || !accessResolved) return;
    const access = { hasFullAccess, kept: keptSlugs, welcomeDate };
    refreshDailyWordWidget(words, favorites, access);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshDailyWordWidget(words, favorites, access);
    });
    return () => sub.remove();
  }, [userHydrated, contentHydrated, accessResolved, words, favorites, hasFullAccess, keptSlugs, welcomeDate]);

  const ready = fontsLoaded && contentHydrated && userHydrated;

  // Save a marketing-email choice made offline or before signing in.
  useEffect(() => {
    if (!userHydrated) return;
    void syncMarketingConsent();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncMarketingConsent();
    });
    return () => sub.remove();
  }, [userHydrated]);

  // Anonymous adoption stats (notifications on, widget placed, free/paid).
  useEffect(() => {
    if (!userHydrated || !accessResolved) return;
    const report = () =>
      void reportDeviceStatus({ plan: hasFullAccess ? 'paid' : 'free', remindersEnabled: notifEnabled });
    report();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') report();
    });
    return () => sub.remove();
  }, [userHydrated, accessResolved, hasFullAccess, notifEnabled]);

  // Notification tap → Today; a free user tapping a paid daily word lands on
  // its unlock page. Access is decided at tap time (they may have upgraded
  // since it was scheduled). Cold starts are read from the last response once
  // the navigator exists; the handled id stops a double navigation.
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponse.current === id) return;
      handledResponse.current = id;
      Notifications.clearLastNotificationResponse();
      const { slug, url } = notificationTarget(
        response.notification.request.content,
        response.notification.request.trigger,
      );
      // Whatever screen was open (a word page, settings), the tap goes back to Today.
      if (router.canDismiss()) router.dismissAll();
      router.navigate('/');
      // One-off and triggered pushes can open any in-app route (e.g. /paywall).
      if (url && !slug) {
        router.push(url as Href);
        return;
      }
      // The daily word: Today opens on it and celebrates (confetti, haptic,
      // streak, scroll cue). A free user's paid word adds the unlock sheet.
      useUserStore.getState().celebrate(slug);
      if (!slug) return;
      // On a cold start the purchase check may still be running, and until it
      // answers everyone reads as free: wait for it, so a paying member isn't
      // sent to the unlock sheet for a word they own.
      whenAccessResolved(() => {
        const user = useUserStore.getState();
        const word = findWord(useContentStore.getState().words, slug);
        if (word && !canBrowseWord(word, user.accessLevel === 'full', new Set(user.keptSlugs))) {
          router.push(`/unlock/${slug}` as Href);
        }
      });
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  if (updatePrompt.kind === 'required') {
    return (
      <>
        <StatusBar style="dark" />
        <UpdateRequiredScreen message={updatePrompt.message} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: brand.cream },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth-callback" options={{ gestureEnabled: false }} />
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sign-in" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="legal/privacy" />
        <Stack.Screen name="legal/terms" />
        <Stack.Screen name="word/[slug]" />
        <Stack.Screen name="favorites" />
        <Stack.Screen
          name="share/[slug]"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="unlock/[slug]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            contentStyle: { backgroundColor: brand.cream },
          }}
        />
      </Stack>
      {onboarded && <UpdateAvailableDialog />}
    </>
  );
}
