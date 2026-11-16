import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Eyebrow, Glyph, Mono, Rule } from '@/components/brand';
import { displayWord } from '@/content/presentation';
import type { Word, WordStory } from '@/content/types';
import { layout, space, type } from '@/theme/tokens';

/**
 * The back of a word's card: where it comes from, its roots, the story or
 * myth around it, and one fun fact. Sections without content are left out.
 */
export function WordStoryBack({
  word,
  story,
  insideSafeArea,
  onFlipBack,
}: {
  word: Pick<Word, 'word' | 'language'>;
  story: WordStory;
  insideSafeArea: boolean;
  onFlipBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insideSafeArea ? space.m : insets.top + space.l },
      ]}
    >
      <Eyebrow tone="muted" style={styles.center}>
        The story of
      </Eyebrow>
      <Body size={40} style={[styles.center, styles.title]} accessibilityRole="header">
        {displayWord(word.word)}
      </Body>
      <Rule style={styles.rule} />

      <Section label="Background">
        <Body size={type.small + 2}>{story.background}</Body>
      </Section>

      {story.roots.length > 0 && (
        <Section label="Roots">
          {story.roots.map((root) => (
            <View key={`${root.part}:${root.meaning}`} style={styles.root}>
              <Mono tone="default" size={15} style={styles.rootPart}>
                {root.part}
              </Mono>
              <Body size={type.small + 1} tone="muted" style={styles.rootMeaning}>
                {root.meaning}
              </Body>
            </View>
          ))}
        </Section>
      )}

      {story.myth ? (
        <Section label="The story">
          <Body size={type.small + 2}>{story.myth}</Body>
        </Section>
      ) : null}

      {story.fun_fact ? (
        <Section label="Fun fact">
          <Body size={type.small + 2} italic>
            {story.fun_fact}
          </Body>
        </Section>
      ) : null}

      <Pressable
        onPress={onFlipBack}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${word.word}`}
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Glyph name="flip" size={20} />
        <Eyebrow tone="default">Back to the word</Eyebrow>
      </Pressable>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow tone="muted">{label}</Eyebrow>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.gutter,
    paddingBottom: space.xl * 2,
    gap: space.l,
  },
  center: { textAlign: 'center' },
  title: { marginTop: -space.s },
  rule: { marginTop: -space.s },
  section: { gap: space.s, maxWidth: 560, alignSelf: 'center', width: '100%' },
  root: { flexDirection: 'row', gap: space.m, alignItems: 'baseline' },
  rootPart: { minWidth: 88 },
  rootMeaning: { flex: 1 },
  back: {
    minHeight: layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    marginTop: space.m,
  },
  pressed: { opacity: 0.6 },
});
