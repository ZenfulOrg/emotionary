import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Eyebrow } from '@/components/brand/Typography';
import { brand } from '@/theme/tokens';

/** Acid dots separate names. */
export function Separator() {
  return <View style={styles.separator} />;
}

/**
 * The meta row: number, category, origin — mono, separated by acid dots.
 * Pass `leading` for a planet, `trailing` for a right-aligned note.
 */
export function MetaRow({
  items,
  leading,
  trailing,
  tone = 'muted',
  style,
}: {
  items: string[];
  leading?: ReactNode;
  trailing?: ReactNode;
  tone?: 'default' | 'muted';
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={items.join(', ')}>
      {leading}
      <View style={styles.items}>
        {items.map((item, index) => (
          <Fragment key={item + index}>
            {index > 0 && <Separator />}
            <Eyebrow tone={tone} numberOfLines={1}>
              {item}
            </Eyebrow>
          </Fragment>
        ))}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  items: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8 },
  separator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: brand.acid },
});
