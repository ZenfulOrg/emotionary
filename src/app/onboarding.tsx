import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAuthForm } from '@/auth/useAuthForm';
import { AuthForm } from '@/components/AuthForm';
import {
  Body,
  Button,
  Eyebrow,
  FloatingCard,
  Glyph,
  Headline,
  IconButton,
  MetaRow,
  Mono,
  OptionRow,
  OrbitBackdrop,
  Panel,
  PlanetDot,
  Rule,
  Screen,
  Wordmark,
} from '@/components/brand';
import { FitToPage } from '@/components/FitToPage';
import { Paywall } from '@/components/Paywall';
import { PronunciationButton } from '@/components/pronunciation-button';
import { StatsBurst } from '@/components/stats-burst';
import { NotificationTimes } from '@/components/NotificationTimes';
import { formatTime } from '@/components/TimeControl';
import { WidgetGuideModal, type WidgetGuideVariant } from '@/components/WidgetGuideModal';
import { WidgetPreview } from '@/components/WidgetPreview';
import { WordTitle } from '@/components/WordFull';
import { WordKey } from '@/components/WordKey';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { isSimulator } from '@/dev/simulator';
import { requestPermission } from '@/notifications/scheduler';
import { findWord, useContentStore } from '@/content/store';
import { sortedNotifTimes, useUserStore, type NotifTime } from '@/store/userStore';
import { layout, levelPalettes, planets, space, type, type GroundName } from '@/theme/tokens';
import { setPaywallPlacement, track } from '@/analytics/track';

const PAGES = [
  'welcome',
  'daily',
  'reminder',
  'widget',
  'key',
  'drawn',
  'account',
  'first-word',
  'paywall',
] as const;

type OnboardingPage = (typeof PAGES)[number];

/** Two grounds: ink opens, explains the planets, and asks; cream does the rest. */
const PAGE_GROUNDS: Record<OnboardingPage, GroundName> = {
  welcome: 'ink',
  daily: 'cream',
  reminder: 'cream',
  widget: 'cream',
  key: 'ink',
  drawn: 'cream',
  account: 'cream',
  'first-word': 'cream',
  paywall: 'cream',
};

const DRAWN_TO = [
  ['Sensations', 'Physical feelings and fleeting body moments'],
  ['Deep, powerful emotions', 'Grief, longing, and awe'],
  ['Love and connection', 'The feelings that pass between people'],
  ['Psychology', 'Terms from the study of the mind'],
] as const;


const pad = (n: number) => String(n).padStart(2, '0');

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedDrawnTo, setSelectedDrawnTo] = useState<string[]>([]);
  const [accountComplete, setAccountComplete] = useState(false);
  const [widgetGuide, setWidgetGuide] = useState<WidgetGuideVariant | null>(null);
  const notifTime = useUserStore((state) => state.notifTime);
  const extraNotifTimes = useUserStore((state) => state.extraNotifTimes);
  const setNotifTimes = useUserStore((state) => state.setNotifTimes);
  const notifTimes = useMemo(() => sortedNotifTimes([notifTime, ...extraNotifTimes]), [notifTime, extraNotifTimes]);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const reducedMotion = useReducedMotion();
  // Lift the CTA well clear of the bottom edge; a little less on short phones.
  const { height: windowHeight } = useWindowDimensions();
  const footerLift = windowHeight >= 700 ? space.xxl : space.l;

  const page = PAGES[step];
  const ground = PAGE_GROUNDS[page];
  useEffect(() => {
    track('onboarding_step_viewed', { step: page, index: step });
    if (page === 'paywall') {
      setPaywallPlacement('onboarding');
      track('paywall_shown', { placement: 'onboarding' });
    }
  }, [page, step]);
  const isFirst = step === 0;

  const goNext = () => setStep((current) => Math.min(current + 1, PAGES.length - 1));
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const authForm = useAuthForm({
    initialMode: 'create',
    onComplete: () => {
      setAccountComplete(true);
      goNext();
    },
  });

  const finish = () => {
    successHaptic();
    track('onboarding_completed', { reminder_count: notifTimes.length, account: accountComplete });
    completeOnboarding();
    router.replace('/');
  };

  const enableAndContinue = async () => {
    lightImpactHaptic();
    const granted = await requestPermission('onboarding');
    setNotifEnabled(granted);
    goNext();
  };

  const toggleDrawnTo = (label: string) =>
    setSelectedDrawnTo((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );

  const pageView = (
    <Animated.View
      key={page}
      entering={reducedMotion ? undefined : FadeInDown.duration(280).easing(Easing.bezier(0.23, 1, 0.32, 1))}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(160)}
      style={styles.page}
    >
      {page === 'welcome' && <WelcomePage />}
      {page === 'daily' && <DailyPage />}
      {page === 'key' && <KeyPage />}
      {page === 'drawn' && <DrawnPage selected={selectedDrawnTo} onToggle={toggleDrawnTo} />}
      {page === 'reminder' && <ReminderPage times={notifTimes} setTimes={setNotifTimes} />}
      {page === 'widget' && <WidgetPage onNext={goNext} onOpenGuide={setWidgetGuide} />}
      {page === 'account' && (
        <PageCopy title="Keep your words close.">
          <AuthForm form={authForm} showSubmit={false} />
        </PageCopy>
      )}
      {page === 'first-word' && <FirstWordPage reducedMotion={reducedMotion} />}
      {page === 'paywall' && <Paywall onContinue={finish} onContinueFree={finish} />}
    </Animated.View>
  );

  return (
    <Screen ground={ground} edges={['top', 'bottom']}>
      {ground === 'ink' && windowHeight >= 700 && <OrbitBackdrop top="4%" />}
      {page === 'first-word' && <StatsBurst burstKey={step + 1} />}

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior="padding"
      >
        {page === 'paywall' ? (
          // The plans and the Buy button must all be on screen, never below a
          // scroll: on a short phone the paywall is fitted to the space.
          <FitToPage contentStyle={styles.scroll}>{pageView}</FitToPage>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {pageView}
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: footerLift }]}>
          <View style={styles.footerSide}>
            {/* Once signed in there's no going back to the sign-in page. */}
            {!isFirst && !(accountComplete && step >= PAGES.indexOf('account')) && (
              <IconButton
                glyph="back"
                accessibilityLabel="Go back"
                onPress={goBack}
                style={styles.back}
              />
            )}
          </View>
          <View style={styles.footerCta}>
            {page === 'reminder' ? (
              <>
                <Button label="Enable daily word" onPress={() => void enableAndContinue()} haptic={false} />
                <Button label="Not now" variant="link" onPress={goNext} />
              </>
            ) : page === 'account' ? (
              <>
              <Button
                label={
                  accountComplete
                    ? 'Continue'
                    : authForm.submitLabel
                }
                onPress={accountComplete ? goNext : () => void authForm.submit()}
                busy={authForm.busy}
              />
              {/* Emulators and simulators only (never a real phone): lets
                  automated beta testing reach the app without an account. */}
              {isSimulator && !accountComplete && (
                <Button label="Skip (test device)" variant="link" onPress={goNext} />
              )}
              </>
            ) : page === 'widget' ? (
              <Button label="How to add the widget" onPress={() => setWidgetGuide('home')} />
            ) : page !== 'paywall' ? (
              <Button
                label={isFirst ? 'Begin' : 'Next'}
                glyph="forward"
                onPress={goNext}
              />
            ) : null}
          </View>
          <View style={[styles.footerSide, styles.footerCount]}>
            <Mono
              size={11}
              tone="muted"
              numberOfLines={1}
              maxFontSizeMultiplier={1}
              accessibilityLabel={`Step ${step + 1} of ${PAGES.length}`}
            >
              {pad(step + 1)} / {pad(PAGES.length)}
            </Mono>
          </View>
        </View>
      </KeyboardAvoidingView>

      <WidgetGuideModal
        variant={widgetGuide ?? 'home'}
        visible={widgetGuide !== null}
        onClose={() => setWidgetGuide(null)}
      />
    </Screen>
  );
}

/** Eyebrow, headline, the drawn rule, a line of body — every page opens the same way. */
function PageCopy({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.copy}>
      {eyebrow ? <Eyebrow style={styles.centeredText}>{eyebrow}</Eyebrow> : null}
      <Headline size={44} style={styles.title}>
        {title}
      </Headline>
      <Rule style={styles.rule} />
      {body && (
        <Body tone="muted" size={19} style={styles.body}>
          {body}
        </Body>
      )}
      {children && <View style={styles.pageContent}>{children}</View>}
    </View>
  );
}

function WelcomePage() {
  return (
    <View style={styles.copy}>
      <Eyebrow style={styles.centeredText}>A language for being alive</Eyebrow>
      <Wordmark size={64} header style={styles.wordmark} />
      <Body tone="muted" size={type.lead + 2} style={styles.intro}>
        One word a day.{'\n'}Expand your emotional palette, and recognize life&apos;s most
        fleeting gifts.
      </Body>
    </View>
  );
}

function DailyPage() {
  return (
    <PageCopy
      title={'One word.\nEvery day.'}
      body={"A single word arrives each day.\nThen keep scrolling through a fresh, random mix whenever you want to discover more."}
    >
      <Panel style={styles.notification}>
        <View
          accessible
          accessibilityLabel="Sample notification: Your word of the day, apricity. The warmth of the sun in winter."
        >
          <MetaRow items={['Emotionary', 'Now']} leading={<PlanetDot wordType="wanderword" />} />
          <Headline accessibilityRole="text" size={24} style={styles.notificationTitle}>
            Your word of the day: apricity
          </Headline>
          <Body size={16} tone="muted">
            the warmth of the sun in winter.
          </Body>
        </View>
      </Panel>
    </PageCopy>
  );
}

function KeyPage() {
  return (
    <PageCopy
      title={'Three planets,\nalways in this order.'}
      body="A small planet always tells you where a word came from."
    >
      <WordKey depths={false} sectionLabels={false} large />
    </PageCopy>
  );
}

function DrawnPage({ selected, onToggle }: { selected: string[]; onToggle: (label: string) => void }) {
  return (
    <PageCopy
      title="What are you drawn to?"
      body="Pick as many as you like."
    >
      <View style={styles.options}>
        {DRAWN_TO.map(([label, description]) => (
          <OptionRow
            key={label}
            role="checkbox"
            title={label}
            body={description}
            selected={selected.includes(label)}
            onPress={() => onToggle(label)}
          />
        ))}
      </View>
    </PageCopy>
  );
}

function ReminderPage({
  times,
  setTimes,
}: {
  times: NotifTime[];
  setTimes: (times: NotifTime[]) => void;
}) {
  // Non-breaking spaces keep "9:00 pm" together when the line wraps.
  const label = times.map((time) => formatTime(time).toLowerCase().replace(/ /g, '\u00a0')).join(' · ');
  return (
    <PageCopy title="Never miss your word." body="Add a time for every part of your day: morning coffee, a lunch break, a quiet night.">
      <Headline
        style={styles.centeredText}
        accessibilityRole="text"
        size={times.length > 2 ? 34 : times.length > 1 ? 44 : 64}
        accessibilityLabel={`Reminders at ${times.map(formatTime).join(', ')}`}
      >
        {label}
      </Headline>
      <NotificationTimes times={times} onChange={setTimes} hint={null} />
    </PageCopy>
  );
}

function WidgetPage({
  onNext,
  onOpenGuide,
}: {
  onNext: () => void;
  onOpenGuide: (variant: WidgetGuideVariant) => void;
}) {
  return (
    <PageCopy
      eyebrow="Widgets"
      title="Add the daily widget."
      body={Platform.OS === 'android' ? "Keep today's word nearby on your home screen. Tap the widget to see how." : "Keep today's word nearby on your Home or Lock Screen. Tap a widget to see how."}
    >
      <View style={styles.widgets}>
        {(Platform.OS === 'android' ? ['home'] as const : ['home', 'lock'] as const).map((variant) => (
          <Pressable
            key={variant}
            onPress={() => {
              selectionHaptic();
              onOpenGuide(variant);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              variant === 'home' ? (Platform.OS === 'android' ? 'How to add the home screen widget' : 'How to add the Home Screen widget') : 'How to add the Lock Screen widget'
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <WidgetPreview variant={variant} />
          </Pressable>
        ))}
      </View>
      <ShakingNext onPress={onNext} />
    </PageCopy>
  );
}

/**
 * The widget slide's Next button gives a small sideways shake after a pause,
 * then every few seconds, so people notice they can move on. Still under
 * Reduce Motion.
 */
function ShakingNext({ onPress }: { onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    const step = (to: number) => withTiming(to, { duration: 60, easing: Easing.inOut(Easing.quad) });
    offset.value = withDelay(
      1200,
      withRepeat(
        withSequence(step(-7), step(7), step(-5), step(5), step(-2), step(0), withDelay(2600, step(0))),
        -1,
      ),
    );
    return () => cancelAnimation(offset);
  }, [reducedMotion, offset]);

  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <Animated.View style={[styles.skip, shake]}>
      <Button label="Next" glyph="forward" onPress={onPress} />
    </Animated.View>
  );
}

function FirstWordPage({ reducedMotion }: { reducedMotion: boolean }) {
  const isSaved = useUserStore((state) => state.favorites.includes('meraki'));
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const openShare = () => router.push('/share/meraki?demo=1');
  // The same recording Today plays. Without it the button fell back to the
  // phone's text-to-speech, which is silent on many Android phones.
  const audioUrl = useContentStore((state) => findWord(state.words, 'meraki')?.audio_url ?? null);

  return (
    <View style={styles.copy}>
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(260)}>
        <Eyebrow style={styles.centeredText}>Your first word</Eyebrow>
        <MetaRow
          centered
          style={styles.firstMeta}
          leading={<PlanetDot wordType="wanderword" />}
          items={[planets.wanderword.label, 'Greek']}
          trailing={<View style={[styles.levelDot, { backgroundColor: levelPalettes[1].accent }]} />}
        />
        <Rule style={styles.firstRule} />
        <View style={styles.pronunciation}>
          <Mono size={14}>V. · /meh-RAH-kee/</Mono>
          <PronunciationButton word="Meraki" language="Greek" audioUrl={audioUrl} />
        </View>
        <WordTitle centered word={{ word: 'Meraki', language: 'Greek', level: 1 }} />
        <Body size={type.definition} style={styles.definition}>
          to do something with soul; leaving a piece of yourself in your work, whether it&apos;s a
          meal, a letter, or a life.
        </Body>
        <Body italic tone="muted" size={type.lead} style={styles.wisdom}>
          What you love leaves fingerprints.
        </Body>
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              lightImpactHaptic();
              toggleFavorite('meraki');
            }}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove meraki from saved words' : 'Save meraki'}
            accessibilityState={{ selected: isSaved }}
          >
            <Glyph name={isSaved ? 'heartFilled' : 'heart'} size={20} />
            <Eyebrow tone="default">{isSaved ? 'Saved' : 'Save'}</Eyebrow>
          </Pressable>
          <Pressable
            onPress={() => {
              selectionHaptic();
              openShare();
            }}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="Share meraki as an image card"
          >
            <Glyph name="leaves" size={20} />
            <Eyebrow tone="default">Share</Eyebrow>
          </Pressable>
        </View>
      </Animated.View>
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(620).springify().damping(17)}>
        <Pressable
          onPress={() => {
            selectionHaptic();
            openShare();
          }}
          accessibilityRole="button"
          accessibilityLabel="Tip: save your favorite words and share them. Opens the share card demo."
        >
          <FloatingCard style={styles.tip}>
            <Eyebrow style={styles.centeredText}>A little tip</Eyebrow>
            <Body style={styles.centeredText} size={17}>Save your favorite words, and tap Share to send them as a card.</Body>
          </FloatingCard>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
    paddingVertical: space.l,
  },
  page: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  copy: { width: '100%', alignItems: 'center' },
  centeredText: { textAlign: 'center' },
  title: { marginTop: space.s, textAlign: 'center' },
  rule: { marginTop: space.m },
  body: { marginTop: space.m, maxWidth: 340, textAlign: 'center' },
  pageContent: { marginTop: space.l, width: '100%' },
  wordmark: { marginTop: space.m, textAlign: 'center' },
  intro: { marginTop: space.l, maxWidth: 320, textAlign: 'center' },
  notification: { padding: space.m },
  notificationTitle: { marginTop: space.s },
  options: { gap: space.s },
  chips: { justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  widgets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.m },
  skip: { alignSelf: 'center', marginTop: space.m },
  pressed: { opacity: 0.72 },
  firstMeta: { marginTop: space.l },
  firstRule: { marginTop: space.s },
  levelDot: { width: 7, height: 7, borderRadius: 3.5 },
  pronunciation: { justifyContent: 'center', flexDirection: 'row', alignItems: 'center', marginTop: space.l },
  definition: { textAlign: 'center', lineHeight: 30, marginTop: space.s },
  wisdom: { marginTop: space.m, textAlign: 'center' },
  actions: { justifyContent: 'center', flexDirection: 'row', gap: space.xl, marginTop: space.m },
  action: { minHeight: layout.touch, flexDirection: 'row', alignItems: 'center', gap: space.s },
  tip: { marginTop: space.l },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s,
    paddingTop: space.s,
    paddingBottom: space.l,
    gap: space.s,
  },
  footerSide: { width: 64 },
  back: { marginLeft: 0 },
  footerCta: { flex: 1, alignItems: 'stretch' },
  footerCount: { alignItems: 'flex-end', paddingRight: space.s },
});
