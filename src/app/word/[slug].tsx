import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, Screen, ScreenHeader } from '@/components/brand';
import { WordFull, WordTitle } from '@/components/WordFull';
import { findWord, useContentStore } from '@/content/store';
import { localDateString, wordOfDay } from '@/daily/engine';
import { canViewWord } from '@/entitlements';
import { useUserStore } from '@/store/userStore';
import { layout, levelPalettes, space } from '@/theme/tokens';

export default function WordDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const words = useContentStore((s) => s.words);
  const sync = useContentStore((s) => s.sync);
  const markRead = useUserStore((s) => s.markRead);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');

  const word = slug ? findWord(words, slug) : undefined;
  const todaysSlug = wordOfDay(words, localDateString())?.slug ?? null;
  const locked = word ? !canViewWord(word, todaysSlug, hasFullAccess) : false;

  useFocusEffect(
    useCallback(() => {
      if (word && !locked) markRead(word.slug);
    }, [word, locked, markRead]),
  );

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/browse');
  };
  const header = <ScreenHeader left={{ glyph: 'back', label: 'Back', onPress: back }} />;

  // Graceful fallback (DESIGN.md §5.3): a routed slug may not resolve, e.g.
  // after a word was unpublished. Never a crash or blank screen.
  if (!word) {
    return (
      <Screen>
        {header}
        <View style={styles.message}>
          <Eyebrow>Not in the dictionary</Eyebrow>
          <Headline size={40}>This word is unavailable.</Headline>
          <Body tone="muted">It may have been removed or renamed.</Body>
          <View style={styles.links}>
            <Button label="Check for updates" variant="link" onPress={() => void sync()} />
            <Button label="Today's word" variant="link" glyph="forward" onPress={() => router.replace('/')} />
          </View>
        </View>
      </Screen>
    );
  }

  if (locked) {
    return (
      <Screen background={levelPalettes[word.level].tint}>
        {header}
        <View style={styles.message}>
          <Eyebrow>Full access</Eyebrow>
          <WordTitle word={word} />
          <Body tone="muted">Unlock every word, every widget theme, and every future update.</Body>
          <Button
            label="Unlock Emotionary"
            onPress={() => router.push('/paywall' as Href)}
            style={styles.unlock}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={levelPalettes[word.level].tint}>
      {header}
      <WordFull word={word} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: space.m,
    paddingHorizontal: layout.gutter,
    paddingBottom: space.xxl,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.l, marginTop: space.s },
  unlock: { marginTop: space.m, alignSelf: 'flex-start' },
});
