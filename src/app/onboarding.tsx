import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutUp, useReducedMotion } from 'react-native-reanimated';

import { useAuthForm } from '@/auth/useAuthForm';
import { AuthForm } from '@/components/AuthForm';
import {
  Body,
  Button,
  Chip,
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
import { Paywall } from '@/components/Paywall';
import { PronunciationButton } from '@/components/pronunciation-button';
import { StatsBurst } from '@/components/stats-burst';
import { formatTime, TimeControl } from '@/components/TimeControl';
import { WidgetGuideModal, type WidgetGuideVariant } from '@/components/WidgetGuideModal';
import { WidgetPreview } from '@/components/WidgetPreview';
import { WordTitle } from '@/components/WordFull';
import { WordKey } from '@/components/WordKey';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import type { NotifTime } from '@/store/userStore';
import { useUserStore } from '@/store/userStore';
import { layout, levelPalettes, planets, space, type, type GroundName } from '@/theme/tokens';

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

const QUICK_TIMES: NotifTime[] = [
  { hour: 11, minute: 11 },
  { hour: 7, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 0 },
];

const pad = (n: number) => String(n).padStart(2, '0');

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedDrawnTo, setSelectedDrawnTo] = useState<string[]>(['Sensations']);
  const [accountComplete, setAccountComplete] = useState(false);
  const [widgetGuide, setWidgetGuide] = useState<WidgetGuideVariant | null>(null);
  const notifTime = useUserStore((state) => state.notifTime);
  const setNotifTime = useUserStore((state) => state.setNotifTime);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const reducedMotion = useReducedMotion();

  const page = PAGES[step];
  const ground = PAGE_GROUNDS[page];
  const isFirst = step === 0;

  const goNext = () => setStep((current) => Math.min(current + 1, PAGES.length - 1));
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const authForm = useAuthForm({
    initialMode: 'create',
    confirmationMessage: 'Check your email to confirm your account. You can keep exploring now.',
    onComplete: () => {
      setAccountComplete(true);
      goNext();
    },
  });

  const finish = () => {
    successHaptic();
    completeOnboarding();
    router.replace('/');
  };

  const enableAndContinue = async () => {
    lightImpactHaptic();
    const granted = await requestPermission();
    setNotifEnabled(granted);
    goNext();
  };

  const toggleDrawnTo = (label: string) =>
    setSelectedDrawnTo((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );

  return (
    <Screen ground={ground} edges={['top', 'bottom']}>
      {ground === 'ink' && <OrbitBackdrop top="4%" />}
      {page === 'first-word' && <StatsBurst burstKey={step + 1} />}

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            {page === 'reminder' && <ReminderPage notifTime={notifTime} setNotifTime={setNotifTime} />}
            {page === 'widget' && <WidgetPage onNext={goNext} onOpenGuide={setWidgetGuide} />}
            {page === 'account' && (
              <PageCopy
                eyebrow="Your account"
                title="Keep your words close."
                body="Create an account to keep your saved words connected."
              >
                <AuthForm form={authForm} showSubmit={false} />
              </PageCopy>
            )}
            {page === 'first-word' && <FirstWordPage reducedMotion={reducedMotion} />}
            {page === 'paywall' && <Paywall onContinue={finish} onContinueFree={finish} />}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSide}>
            {!isFirst && (
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
              <Button
                label={
                  accountComplete
                    ? 'Continue'
                    : authForm.mode === 'create'
                      ? 'Create account'
                      : 'Sign in'
                }
                onPress={accountComplete ? goNext : () => void authForm.submit()}
                busy={authForm.busy}
              />
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
  eyebrow: string;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.copy}>
      <Eyebrow>{eyebrow}</Eyebrow>
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
      <Eyebrow>A language for being alive</Eyebrow>
      <Wordmark size={64} header style={styles.wordmark} />
      <Body tone="muted" size={type.lead + 2} style={styles.intro}>
        One word a day. Expand your emotional palette, and recognize life&apos;s most fleeting
        gifts.
      </Body>
    </View>
  );
}

function DailyPage() {
  return (
    <PageCopy
      eyebrow="The daily word"
      title={'One word.\nEvery day.'}
      body="A single word arrives each day. Then keep scrolling through a fresh, random mix whenever you want to discover more."
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
      eyebrow="The mark"
      title={'Three planets,\nalways in this order.'}
      body="A small planet always tells you where a word came from."
    >
      <WordKey depths={false} />
    </PageCopy>
  );
}

function DrawnPage({ selected, onToggle }: { selected: string[]; onToggle: (label: string) => void }) {
  return (
    <PageCopy
      eyebrow="Your palette"
      title="What are you drawn to?"
      body="Pick as many as you like. You can change this later."
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
  notifTime,
  setNotifTime,
}: {
  notifTime: NotifTime;
  setNotifTime: (time: NotifTime) => void;
}) {
  return (
    <PageCopy
      eyebrow="A gentle nudge"
      title="Never miss your word."
      body="Once a day, at the time you choose."
    >
      <Headline accessibilityRole="text" size={64} accessibilityLabel={`Reminder at ${formatTime(notifTime)}`}>
        {formatTime(notifTime).toLowerCase()}
      </Headline>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Quick times">
        {QUICK_TIMES.map((time) => {
          const label = formatTime(time);
          return (
            <Chip
              key={label}
              label={label}
              role="radio"
              selected={time.hour === notifTime.hour && time.minute === notifTime.minute}
              onPress={() => setNotifTime(time)}
            />
          );
        })}
      </View>
      <View style={styles.picker}>
        <TimeControl value={notifTime} onChange={setNotifTime} />
      </View>
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
      body="Keep today's word nearby on your Home or Lock Screen. Tap a widget to see how."
    >
      <View style={styles.widgets}>
        {(['home', 'lock'] as const).map((variant) => (
          <Pressable
            key={variant}
            onPress={() => {
              selectionHaptic();
              onOpenGuide(variant);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              variant === 'home' ? 'How to add the Home Screen widget' : 'How to add the Lock Screen widget'
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <WidgetPreview variant={variant} />
          </Pressable>
        ))}
      </View>
      <Button label="Next" glyph="forward" onPress={onNext} style={styles.skip} />
    </PageCopy>
  );
}

function FirstWordPage({ reducedMotion }: { reducedMotion: boolean }) {
  const isSaved = useUserStore((state) => state.favorites.includes('meraki'));
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const openShare = () => router.push('/share/meraki?demo=1');

  return (
    <View style={styles.copy}>
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(260)}>
        <Eyebrow>Your first word</Eyebrow>
        <MetaRow
          style={styles.firstMeta}
          leading={<PlanetDot wordType="wanderword" />}
          items={[planets.wanderword.label, 'Greek']}
          trailing={<View style={[styles.levelDot, { backgroundColor: levelPalettes[1].accent }]} />}
        />
        <Rule style={styles.firstRule} />
        <View style={styles.pronunciation}>
          <Mono size={14}>V. · /meh-RAH-kee/</Mono>
          <PronunciationButton word="Meraki" />
        </View>
        <WordTitle word={{ word: 'Meraki', language: 'Greek', level: 1 }} />
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
            <Eyebrow>A little tip</Eyebrow>
            <Body size={17}>Save your favorite words, and tap Share to send them as a card.</Body>
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
  copy: { width: '100%' },
  title: { marginTop: space.s },
  rule: { marginTop: space.m },
  body: { marginTop: space.m, maxWidth: 340 },
  pageContent: { marginTop: space.l },
  wordmark: { marginTop: space.m, marginLeft: -2 },
  intro: { marginTop: space.l, maxWidth: 320 },
  notification: { padding: space.m },
  notificationTitle: { marginTop: space.s },
  options: { gap: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  picker: { marginTop: space.m },
  widgets: { flexDirection: 'row', gap: space.m },
  skip: { alignSelf: 'flex-start', marginTop: space.m },
  pressed: { opacity: 0.72 },
  firstMeta: { marginTop: space.l },
  firstRule: { marginTop: space.s },
  levelDot: { width: 7, height: 7, borderRadius: 3.5 },
  pronunciation: { flexDirection: 'row', alignItems: 'center', marginTop: space.l },
  definition: { lineHeight: 30, marginTop: space.s },
  wisdom: { marginTop: space.m },
  actions: { flexDirection: 'row', gap: space.xl, marginTop: space.m },
  action: { minHeight: layout.touch, flexDirection: 'row', alignItems: 'center', gap: space.s },
  tip: { marginTop: space.l },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s,
    paddingTop: space.s,
    paddingBottom: space.s,
    gap: space.s,
  },
  footerSide: { width: 64 },
  back: { marginLeft: 0 },
  footerCta: { flex: 1, alignItems: 'stretch' },
  footerCount: { alignItems: 'flex-end', paddingRight: space.s },
});
