import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SystemIcon } from '@/components/system-icon';
import { PronunciationButton } from '@/components/pronunciation-button';
import { wordTitleSize } from '@/components/word-title-size';
import { TypeBadge } from '@/components/TypeBadge';
import { pronunciationLineFor } from '@/content/part-of-speech';
import type { Word } from '@/content/types';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

const COPY_TOAST_MS = 1500;

/**
 * The full word layout shared by Today and Word Detail (DESIGN.md §5.1/§5.3):
 * type badge → display-serif word → [pronunciation] → origin → definition,
 * with the wisdom line + SAVE/SHARE anchored at the bottom.
 * Long-pressing the word or the definition copies it to the clipboard.
 */
export function WordFull({
  word,
  feedPage = false,
  insideSafeArea = false,
  audioActive = true,
}: {
  word: Word;
  feedPage?: boolean;
  insideSafeArea?: boolean;
  audioActive?: boolean;
}) {
  const isFavorite = useUserStore((s) => s.favorites.includes(word.slug));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const palette = levelPalettes[word.level];
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState<'word' | 'definition' | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

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
      <View style={styles.top}>
        <TypeBadge wordType={word.type} />
        <Text
          style={[styles.word, { fontSize: wordTitleSize(word.word) }]}
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          accessibilityRole="header"
          accessibilityLabel={`${word.word}. ${word.language}. Level ${word.level}.`}
          accessibilityHint="Long press to copy the word"
          onLongPress={() => copyToClipboard('word')}
          suppressHighlighting
        >
          {word.word}
        </Text>
        <View style={styles.pronunciationRow}>
          <Text style={styles.pronunciation} maxFontSizeMultiplier={1.6}>
            {pronunciationLineFor(word)}
          </Text>
          <PronunciationButton word={word.word} active={audioActive} />
        </View>
        <Text style={styles.origin}>{word.language.toUpperCase()}</Text>
        <Text
          style={styles.definition}
          accessibilityHint="Long press to copy the definition"
          onLongPress={() => copyToClipboard('definition')}
          suppressHighlighting
        >
          {word.definition}
        </Text>
      </View>

      <View style={[styles.bottom, feedPage && styles.feedBottom]}>
        <View style={styles.rule} />
        <Text style={styles.wisdom}>{word.wisdom}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              lightImpactHaptic();
              toggleFavorite(word.slug);
            }}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from saved words' : 'Save this word'}
            hitSlop={8}
          >
            <SystemIcon
              name={isFavorite ? 'heart.fill' : 'heart'}
              fallback={isFavorite ? '♥' : '♡'}
              size={21}
              color={isFavorite ? palette.deep : color.ink}
            />
            <Text style={styles.actionLabel}>{isFavorite ? 'SAVED' : 'SAVE'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              selectionHaptic();
              router.push(`/share/${word.slug}`);
            }}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="Share this word as an image card"
            hitSlop={8}
          >
            <SystemIcon
              name="square.and.arrow.up"
              fallback="↑"
              size={21}
              color={color.ink}
            />
            <Text style={styles.actionLabel}>SHARE</Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.tint }]}>
      {copied && (
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(260)}
          style={styles.copiedToast}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.copiedText}>
            {copied === 'word' ? 'Word copied' : 'Definition copied'}
          </Text>
        </Animated.View>
      )}
      {feedPage ? (
        <View
          style={[
            styles.scroll,
            styles.feedScroll,
            { paddingTop: insideSafeArea ? space.s : insets.top + space.l, paddingBottom: space.l },
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space.l,
    paddingTop: space.xl,
    paddingBottom: 112,
  },
  feedScroll: { flex: 1 },
  top: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  word: {
    fontFamily: font.display,
    fontSize: 56,
    lineHeight: 62,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.m,
  },
  pronunciation: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    color: color.inkMuted,
    textAlign: 'center',
  },
  pronunciationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: space.xs,
  },
  origin: {
    fontFamily: font.serifMedium,
    fontSize: type.caption,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: space.xs,
    textAlign: 'center',
  },
  definition: {
    fontFamily: font.serif,
    fontSize: 21,
    lineHeight: 32,
    color: color.ink,
    marginTop: space.l,
    width: '100%',
    maxWidth: 330,
    alignSelf: 'center',
    textAlign: 'center',
  },
  bottom: { alignItems: 'center', marginTop: space.xxl },
  feedBottom: { marginTop: space.xl },
  rule: {
    height: 4,
    borderRadius: 2,
    backgroundColor: color.inkFaint,
    alignSelf: 'stretch',
  },
  wisdom: {
    fontFamily: font.serifItalic,
    fontSize: type.body,
    lineHeight: type.body * 1.5,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.l,
    paddingHorizontal: space.m,
  },
  actions: {
    flexDirection: 'row',
    gap: space.xxl,
    marginTop: space.l,
  },
  action: { alignItems: 'center', gap: 4, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  actionLabel: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  copiedToast: {
    position: 'absolute',
    top: space.m,
    alignSelf: 'center',
    zIndex: 30,
    borderRadius: 999,
    backgroundColor: color.ink,
    paddingHorizontal: space.m,
    paddingVertical: 8,
    boxShadow: '0 8px 20px rgba(33, 28, 21, 0.22)',
  },
  copiedText: {
    fontFamily: font.serifMedium,
    fontSize: type.caption,
    letterSpacing: 0.4,
    color: color.paper,
  },
});
