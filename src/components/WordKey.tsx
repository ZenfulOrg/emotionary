import { StyleSheet, View } from 'react-native';

import { Body, Dialog, Eyebrow, Headline, PlanetDot, Rule } from '@/components/brand';
import { LEVELS, levelPalettes, PLANET_ORDER, planets, space } from '@/theme/tokens';

/** The key: the planets are the categories; the mood colors are the depths. */
export function WordKey({ depths = true }: { depths?: boolean }) {
  return (
    <View>
      <Eyebrow tone="muted" style={styles.section}>
        01 / The categories
      </Eyebrow>
      <Rule />
      {PLANET_ORDER.map((key) => (
        <View key={key} style={styles.line} accessible>
          <View style={styles.mark}>
            <PlanetDot wordType={key} scale={1.3} glow />
          </View>
          <View style={styles.copy}>
            <Eyebrow tone="default">{planets[key].label}</Eyebrow>
            <Body size={16} tone="muted">
              {planets[key].body}
            </Body>
          </View>
        </View>
      ))}

      {depths && (
        <>
          <Eyebrow tone="muted" style={[styles.section, styles.spaced]}>
            02 / The depths
          </Eyebrow>
          <Rule delay={200} />
          {LEVELS.map((level) => (
            <View key={level} style={styles.line} accessible>
              <View style={styles.mark}>
                <View style={[styles.levelDot, { backgroundColor: levelPalettes[level].accent }]} />
              </View>
              <View style={styles.copy}>
                <Eyebrow tone="default">
                  Level {level} · {levelPalettes[level].name}
                </Eyebrow>
                <Body size={16} tone="muted">
                  {levelPalettes[level].description}
                </Body>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function WordKeyDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Dialog visible={visible} onClose={onClose} closeLabel="Close the key">
      <Eyebrow>The key</Eyebrow>
      <Headline size={34} style={styles.title}>
        Three planets,{'\n'}five depths.
      </Headline>
      <WordKey />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.s, marginBottom: space.l },
  section: { marginBottom: space.s },
  spaced: { marginTop: space.xl },
  line: { flexDirection: 'row', gap: space.m, marginTop: space.m },
  mark: { width: 20, alignItems: 'center', paddingTop: 4 },
  copy: { flex: 1, gap: 2 },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
});
