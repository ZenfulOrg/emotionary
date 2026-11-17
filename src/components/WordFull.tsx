import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Body,
  Eyebrow,
  FloatingCard,
  Glyph,
  MetaRow,
  Mono,
  PlanetDot,
  Rule,
} from '@/components/brand';
import { LockedMeaning } from '@/components/LockedMeaning';
import { PronunciationButton } from '@/components/pronunciation-button';
import { wordTitleSize } from '@/components/word-title-size';
import { pronunciationLineFor } from '@/content/part-of-speech';
import { asEntry, displayWord } from '@/content/presentation';
import type { Word } from '@/content/types';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { ScrollHint } from '@/components/ScrollHint';
import { WordStoryBack } from '@/components/WordStoryBack';
import { liveStory } from '@/content/story';
import { useUserStore } from '@/store/userStore';
import { useGround } from '@/theme/ground';
import { font, layout, levelPalettes, planets, space, tracking, type } from '@/theme/tokens';

const COPY_TOAST_MS = 1500;

/**
 * The full word, shared by Today and Word Detail — the site, folded into a
 * page: meta row over a hairline; pronunciation in mono between slashes; the
 * word lowercase and huge; the definition lowercase, ending in a period; then
 * the italic line. Long-pressing the word or the definition copies it.
 */
export function WordFull({
  word,
  feedPage = false,
  insideSafeArea = false,
  audioActive = true,
  meaningLocked = false,
  eyebrow,
  reveal = false,
  scrollHint,
}: {
  word: Word;
  feedPage?: boolean;
  insideSafeArea?: boolean;
  audioActive?: boolean;
  /** Free plan, paid daily word: show the word, blur the meaning. */
  meaningLocked?: boolean;
  /** A small label over the meta row, e.g. "Today's word". */
  eyebrow?: string;
  /** Play the once-a-day reveal: each part rises in, the word last and springy. */
  reveal?: boolean;
  /** Today's first page: a cue that more words wait below. */
  scrollHint?: { label: string; onPress: () => void };
}) {
  const isFavorite = useUserStore((s) => s.favorites.includes(word.slug));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const story = liveStory(word);
  // The card flips to its story (Pro). The back mounts on first flip only.
  const [flipped, setFlipped] = useState(false);
  const [backMounted, setBackMounted] = useState(false);
  const flip = useSharedValue(0);
  const level = levelPalettes[word.level];
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState<'word' | 'definition' | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const animate = reveal && !reducedMotion;
  // Staggered like onboarding's "Your first word": label, pronunciation, the
  // word (springy, it lands with the haptic), then its meaning and actions.
  const rise = (delay: number) => (animate ? FadeInDown.delay(delay).duration(420) : undefined);
  const wordEntering = animate
    ? FadeInDown.delay(260).springify().damping(13).mass(0.9)
    : undefined;
  // Just unlocked (bought while this page was showing): the meaning appears
  // with a slow fade instead of a jump.
  const wasLocked = useRef(meaningLocked);
  const [unlockReveal, setUnlockReveal] = useState(0);
  useEffect(() => {
    if (wasLocked.current && !meaningLocked) setUnlockReveal((n) => n + 1);
    wasLocked.current = meaningLocked;
  }, [meaningLocked]);
  const meaningEntering = animate
    ? FadeIn.delay(700).duration(520)
    : unlockReveal > 0 && !reducedMotion
      ? FadeInDown.duration(900)
      : undefined;

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const flipDuration = reducedMotion ? 0 : 520;
  const setFlip = (next: boolean) => {
    if (next) setBackMounted(true);
    setFlipped(next);
    flip.value = withTiming(next ? 1 : 0, { duration: flipDuration });
  };
  const openStory = () => {
    selectionHaptic();
    if (!hasFullAccess) {
      router.push('/paywall' as Href);
      return;
    }
    setFlip(true);
  };
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [-180, 0])}deg` }],
  }));

  const copyToClipboard = (what: 'word' | 'definition') => {
    // Lazy import — expo-clipboard registers a native paste-button view at
    // module scope, which breaks web/server rendering if imported statically.
    void import('expo-clipboard').then((Clipboard) =>
      Clipboard.setStringAsync(what === 'word' ? word.word : word.definition),
    );
    successHaptic();
    setCopied(what);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), COPY_TOAST_MS);
  };

  const content = (
    <>
      <Animated.View entering={rise(0)}>
        {eyebrow && (
          <Eyebrow style={[styles.eyebrow, feedPage && styles.centeredText]}>{eyebrow}</Eyebrow>
        )}
        <MetaRow
          centered={feedPage}
          leading={<PlanetDot wordType={word.type} />}
          items={[planets[word.type].label, word.language]}
          trailing={
            !feedPage && (
              <View
                style={styles.level}
                accessible
                accessibilityLabel={`Level ${word.level}, ${level.name}`}
              >
                <Eyebrow tone="muted">Level {word.level}</Eyebrow>
                <View style={[styles.levelDot, { backgroundColor: level.accent }]} />
              </View>
            )
          }
        />
        <Rule style={styles.metaRule} />
      </Animated.View>

      <View style={[styles.entry, feedPage && styles.centeredEntry]}>
        <Animated.View
          entering={rise(120)}
          style={[styles.pronunciationRow, feedPage && styles.centeredRow]}
        >
          <Mono size={14} accessibilityLabel={`Pronounced ${word.pronunciation}`}>
            {pronunciationLineFor(word)}
          </Mono>
          <PronunciationButton
            word={word.word}
            language={word.language}
            audioUrl={word.audio_url}
            active={audioActive}
          />
        </Animated.View>
        <Animated.View entering={wordEntering}>
          <WordTitle word={word} centered={feedPage} onLongPress={() => copyToClipboard('word')} />
        </Animated.View>
        <Animated.View key={`meaning-${unlockReveal}`} entering={meaningEntering}>
          {meaningLocked ? (
            <LockedMeaning
              slug={word.slug}
              definition={asEntry(word.definition)}
              textStyle={styles.lockedDefinition}
              centered={feedPage}
            />
          ) : (
            <Body
              size={type.definition}
              style={[styles.definition, feedPage && styles.centeredText]}
              accessibilityLabel={word.definition}
              accessibilityHint="Long press to copy the definition"
              onLongPress={() => copyToClipboard('definition')}
              suppressHighlighting
            >
              {asEntry(word.definition)}
            </Body>
          )}
        </Animated.View>
        {/* Right under the meaning, where the eyes already are. */}
        <Animated.View entering={rise(820)}>
          <View style={[styles.actions, feedPage && styles.centeredRow]}>
            <WordAction
              glyph={isFavorite ? 'heartFilled' : 'heart'}
              label={isFavorite ? 'Saved' : 'Save'}
              accessibilityLabel={isFavorite ? 'Remove from saved words' : 'Save this word'}
              selected={isFavorite}
              onPress={() => {
                lightImpactHaptic();
                toggleFavorite(word.slug);
              }}
            />
            <WordAction
              glyph="leaves"
              label="Share"
              accessibilityLabel="Share this word as an image card"
              onPress={() => {
                selectionHaptic();
                router.push((meaningLocked ? `/unlock/${word.slug}` : `/share/${word.slug}`) as Href);
              }}
            />
            {story ? (
              <WordAction
                glyph="flip"
                label="Origin"
                accessibilityLabel={
                  hasFullAccess ? `Read the origin of ${word.word}` : 'Word origins come with Emotionary Pro'
                }
                onPress={openStory}
              />
            ) : null}
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={rise(900)} style={[styles.bottom, feedPage && styles.feedBottom]}>
        <Rule />
        {meaningLocked ? (
          <Body
            italic
            size={type.small}
            tone="muted"
            style={[styles.wisdom, feedPage && styles.centeredText]}
          >
            Its meaning, and where it comes from.
          </Body>
        ) : (
          <Body
            italic
            size={type.lead}
            tone="muted"
            style={[styles.wisdom, feedPage && styles.centeredText]}
          >
            {word.wisdom}
          </Body>
        )}
        {scrollHint ? <ScrollHint label={scrollHint.label} onPress={scrollHint.onPress} /> : null}
      </Animated.View>
    </>
  );

  return (
    <View style={styles.screen}>
      {copied && (
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(260)}
          style={styles.toastLayer}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <FloatingCard style={styles.toast}>
            <Eyebrow>{copied === 'word' ? 'Word copied' : 'Definition copied'}</Eyebrow>
          </FloatingCard>
        </Animated.View>
      )}
      <Animated.View
        style={[styles.face, frontStyle]}
        pointerEvents={flipped ? 'none' : 'auto'}
        accessibilityElementsHidden={flipped}
        importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
      >
        {feedPage ? (
          <View
            style={[
              styles.scroll,
              styles.feedScroll,
              {
                paddingTop: insideSafeArea ? space.m : insets.top + space.l,
                paddingBottom: space.l,
              },
            ]}
          >
            {content}
          </View>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        )}
      </Animated.View>
      {story && backMounted ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.back, { backgroundColor: level.tint }, backStyle]}
          pointerEvents={flipped ? 'auto' : 'none'}
          accessibilityElementsHidden={!flipped}
          importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        >
          <WordStoryBack
            word={word}
            story={story}
            insideSafeArea={insideSafeArea}
            onFlipBack={() => {
              selectionHaptic();
              setFlip(false);
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The word itself: display, lowercase, one line, tighter the bigger it gets. */
export function WordTitle({
  word,
  size,
  centered = false,
  onLongPress,
}: {
  word: Pick<Word, 'word' | 'language' | 'level'>;
  size?: number;
  centered?: boolean;
  onLongPress?: () => void;
}) {
  const ground = useGround();
  const { width } = useWindowDimensions();
  const fontSize = size ?? wordTitleSize(word.word, width - layout.gutter * 2);
  return (
    <Text
      style={[
        styles.word,
        centered && styles.centeredWord,
        {
          color: ground.text,
          fontSize,
          lineHeight: Math.round(fontSize * 1.08),
          letterSpacing: tracking(fontSize, fontSize >= 60 ? -0.05 : -0.04),
        },
      ]}
      maxFontSizeMultiplier={1.2}
      numberOfLines={1}
      accessibilityRole="header"
      accessibilityLabel={`${word.word}. ${word.language}. Level ${word.level}.`}
      accessibilityHint={onLongPress ? 'Long press to copy the word' : undefined}
      onLongPress={onLongPress}
      suppressHighlighting
    >
      {displayWord(word.word)}
    </Text>
  );
}

function WordAction({
  glyph,
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  glyph: 'heart' | 'heartFilled' | 'leaves' | 'flip';
  label: string;
  accessibilityLabel: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={8}
    >
      <Glyph name={glyph} size={20} />
      <Eyebrow tone="default">{label}</Eyebrow>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginBottom: space.s },
  screen: { flex: 1 },
  face: { flex: 1, backfaceVisibility: 'hidden' },
  back: { backfaceVisibility: 'hidden' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    paddingBottom: 112,
  },
  feedScroll: { flex: 1 },
  centeredEntry: { alignItems: 'center' },
  centeredRow: { justifyContent: 'center', marginLeft: 0 },
  centeredText: { textAlign: 'center' },
  centeredWord: { textAlign: 'center', marginLeft: 0, alignSelf: 'stretch' },
  level: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  levelDot: { width: 7, height: 7, borderRadius: 3.5 },
  metaRule: { marginTop: space.s + 2 },
  entry: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.xl },
  pronunciationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: -2,
  },
  word: { fontFamily: font.display, marginTop: space.xs, marginLeft: -3 },
  definition: {
    lineHeight: Math.round(type.definition * 1.32),
    marginTop: space.m,
    maxWidth: 360,
  },
  lockedDefinition: { lineHeight: Math.round(type.definition * 1.32) },
  bottom: { marginTop: space.xl },
  feedBottom: { marginTop: space.m },
  wisdom: { marginTop: space.m },
  actions: { flexDirection: 'row', gap: space.xl, marginTop: space.l },
  action: {
    minHeight: layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
  },
  pressed: { opacity: 0.6 },
  toastLayer: {
    position: 'absolute',
    top: space.m,
    alignSelf: 'center',
    zIndex: 30,
  },
  toast: { paddingVertical: 10 },
});
