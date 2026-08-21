import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemIcon } from '@/components/system-icon';
import { WordCard } from '@/components/WordCard';
import { findWord, useContentStore } from '@/content/store';
import { localDateString, wordOfDay } from '@/daily/engine';
import { canViewWord } from '@/entitlements';
import { selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, space, type } from '@/theme/tokens';

/** The full favorited-words list, opened from the Stats pill. */
export default function FavoritesScreen() {
  const words = useContentStore((s) => s.words);
  const favorites = useUserStore((s) => s.favorites);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const todaysSlug = wordOfDay(words, localDateString())?.slug ?? null;

  const favoriteWords = favorites
    .map((slug) => findWord(words, slug))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            selectionHaptic();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/stats');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backButton}
        >
          <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Favorited Words
        </Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={favoriteWords}
        keyExtractor={(w) => w.slug}
        renderItem={({ item }) => (
          <WordCard word={item} locked={!canViewWord(item, todaysSlug, hasFullAccess)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Nothing saved yet.</Text>
            <Text style={styles.emptyHint}>Tap ♡ SAVE on any word to keep it here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  headerRow: {
    marginTop: space.s,
    paddingHorizontal: space.m,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: type.title - 4, color: color.ink },
  list: { paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: 112 },
  emptyWrap: { alignItems: 'center', marginTop: space.xxl, gap: space.s },
  emptyText: { fontFamily: font.serif, fontSize: type.body, color: color.inkMuted },
  emptyHint: { fontFamily: font.serif, fontSize: type.small, color: color.inkFaint },
});
