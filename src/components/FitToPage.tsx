import type React from 'react';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A page that must never scroll or clip: when its content is taller than the
 * space it has (a short phone, a large display or font size), the whole page
 * is scaled down from the top just enough to fit. With room to spare it is
 * untouched, and `contentStyle` lays it out as usual (e.g. centred).
 *
 * The content is measured in an absolute layer: a flex parent can squeeze or
 * misreport an in-flow child's height, which hid the overflow before.
 */
export function FitToPage({
  height,
  contentStyle,
  children,
  testID,
}: {
  /** The page height when the caller knows it (a paging feed); else measured. */
  height?: number;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
}) {
  const [measured, setMeasured] = useState(0);
  const [natural, setNatural] = useState(0);
  const available = height && height > 0 ? height : measured;
  const scale = fitScale(available, natural);

  return (
    <View
      style={styles.frame}
      onLayout={(event) => setMeasured(Math.round(event.nativeEvent.layout.height))}
    >
      <View
        testID={testID}
        onLayout={(event) => setNatural(Math.round(event.nativeEvent.layout.height))}
        style={[
          contentStyle,
          available > 0 ? [styles.layer, { minHeight: available }] : styles.fill,
          scale < 1 && { transform: [{ scale }], transformOrigin: 'top' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** How much a page of `natural` height must shrink to fit `available`. */
export function fitScale(available: number, natural: number): number {
  return available > 0 && natural > available + 1 ? available / natural : 1;
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, flexGrow: 0 },
});
