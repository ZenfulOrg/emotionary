import { useMemo, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Chip,
  Eyebrow,
  Headline,
  PlanetDot,
  Rule,
  Screen,
  TextField,
} from '@/components/brand';
import { WordCard } from '@/components/WordCard';
import { WordKeyDialog } from '@/components/WordKey';
import { useContentStore } from '@/content/store';
import type { WordType } from '@/content/types';
import { canBrowseWord } from '@/entitlements';
import { selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { layout, PLANET_ORDER, planets, space } from '@/theme/tokens';

type TypeFilter = WordType | 'all';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export default function BrowseScreen() {
  const words = useContentStore((s) => s.words);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [keyOpen, setKeyOpen] = useState(false);
  const hasFullAccess = useUserStore((state) => state.accessLevel === 'full');

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return words
      .filter((w) => (typeFilter === 'all' ? true : w.type === typeFilter))
      .filter((w) =>
        q.length === 0 ? true : normalize(w.word).includes(q) || normalize(w.definition).includes(q),
      )
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [words, query, typeFilter]);

  const hasActiveFilters = query.length > 0 || typeFilter !== 'all';
  const chooseFilter = (next: TypeFilter) => {
    Keyboard.dismiss();
    setTypeFilter(next);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <Eyebrow style={styles.eyebrow}>The dictionary · {words.length} words</Eyebrow>
          <Button
            label="Key"
            variant="link"
            onPress={() => setKeyOpen(true)}
            accessibilityLabel="How words are categorized"
          />
        </View>
        <Headline size={44}>Every word.</Headline>
        <Rule style={styles.rule} />
      </View>

      <View style={styles.search}>
        <TextField
          placeholder="Search words and meanings"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          accessibilityLabel="Search words"
          clearButtonMode="while-editing"
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Filter by category">
        <Chip
          label="All"
          role="radio"
          selected={typeFilter === 'all'}
          onPress={() => chooseFilter('all')}
          accessibilityLabel="All categories"
        />
        {PLANET_ORDER.map((key) => (
          <Chip
            key={key}
            label={planets[key].label}
            role="radio"
            selected={typeFilter === key}
            onPress={() => chooseFilter(key)}
            leading={<PlanetDot wordType={key} />}
          />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(w) => w.slug}
        renderItem={({ item }) => (
          <WordCard word={item} locked={!canBrowseWord(item, hasFullAccess)} />
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Body tone="muted">No words match.</Body>
            {hasActiveFilters && (
              <Button
                label="Clear filters"
                variant="link"
                onPress={() => {
                  Keyboard.dismiss();
                  selectionHaptic();
                  setQuery('');
                  setTypeFilter('all');
                }}
              />
            )}
          </View>
        }
      />

      <WordKeyDialog visible={keyOpen} onClose={() => setKeyOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: layout.gutter, paddingTop: space.s, gap: space.xs },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -space.s,
  },
  eyebrow: { flexShrink: 1 },
  rule: { marginTop: space.s },
  search: { paddingHorizontal: layout.gutter, marginTop: space.m },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s,
    paddingHorizontal: layout.gutter,
    marginTop: space.m,
    paddingBottom: space.m,
  },
  list: { paddingHorizontal: layout.gutter, paddingTop: space.m, paddingBottom: 120 },
  emptyWrap: { alignItems: 'center', marginTop: space.xxl, gap: space.s },
});
