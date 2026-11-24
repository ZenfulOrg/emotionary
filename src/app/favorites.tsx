import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { Body, PageTitle, Screen, ScreenHeader } from '@/components/brand';
import { WordCard } from '@/components/WordCard';
import { findWord, useContentStore } from '@/content/store';
import { localDateString } from '@/daily/engine';
import { useTodaysWord } from '@/daily/useTodaysWord';
import { wordAccess } from '@/entitlements';
import { useKeptSlugs } from '@/store/useKeptSlugs';
import { useUserStore } from '@/store/userStore';
import { layout, space } from '@/theme/tokens';

/** The saved-words list, opened from Stats. */
export default function FavoritesScreen() {
  const words = useContentStore((s) => s.words);
  const favorites = useUserStore((s) => s.favorites);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const kept = useKeptSlugs();
  const todaysSlug = useTodaysWord(localDateString())?.slug ?? null;

  const favoriteWords = favorites
    .map((slug) => findWord(words, slug))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <Screen>
      <ScreenHeader
        left={{
          glyph: 'back',
          label: 'Back',
          onPress: () => (router.canGoBack() ? router.back() : router.replace('/stats')),
        }}
      />
      <FlatList
        data={favoriteWords}
        keyExtractor={(w) => w.slug}
        renderItem={({ item }) => (
          // Today's word stays a teaser here too, as on Today.
          <WordCard word={item} locked={wordAccess(item, todaysSlug, hasFullAccess, kept) !== 'full'} />
        )}
        ListHeaderComponent={
          <PageTitle
            eyebrow={`Saved · ${favoriteWords.length} ${favoriteWords.length === 1 ? 'word' : 'words'}`}
            title="Your word collection."
            size={44}
            style={styles.title}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Body tone="muted">Nothing saved yet.</Body>
            <Body size={16} tone="muted">
              Tap ♡ Save on any word to keep it here.
            </Body>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingBottom: 112 },
  title: { marginBottom: space.l },
  emptyWrap: { gap: space.xs },
});
