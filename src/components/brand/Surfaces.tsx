import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, type ReactNode } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { IconButton } from '@/components/brand/Controls';
import { type GlyphName } from '@/components/brand/Glyph';
import { Rule } from '@/components/brand/Rule';
import { Eyebrow, Headline } from '@/components/brand/Typography';
import { GroundProvider, useGround } from '@/theme/ground';
import { brand, grounds, layout, scrim, space, type GroundName } from '@/theme/tokens';

const GRAIN = require('../../../assets/images/grain.png');

/** Every page wears a fine grain at 4.5 percent — laid last, over everything, untouchable. */
export function Grain({ opacity = 0.045 }: { opacity?: number }) {
  return (
    <Image
      source={GRAIN}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, styles.grain, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Keeps the status bar legible on whichever ground the focused screen wears. */
export function useGroundStatusBar(ground: GroundName) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(grounds[ground].statusBar, true);
    }, [ground]),
  );
}

/**
 * A route's root surface: sets the ground for every primitive inside it,
 * paints the background (or a level tint), lays the grain and syncs the
 * status bar.
 */
export function Screen({
  ground = 'cream',
  background,
  edges = ['top'],
  grain = true,
  style,
  children,
}: {
  ground?: GroundName;
  background?: string;
  edges?: Edge[];
  grain?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  useGroundStatusBar(ground);
  return (
    <GroundProvider ground={ground}>
      <SafeAreaView
        edges={edges}
        style={[styles.screen, { backgroundColor: background ?? grounds[ground].background }, style]}
      >
        {children}
        {grain && <Grain />}
      </SafeAreaView>
    </GroundProvider>
  );
}

/** Top bar: a glyph control left, an optional eyebrow centered, an optional control right. */
export function ScreenHeader({
  left,
  eyebrow,
  right,
}: {
  left?: { glyph: GlyphName; label: string; onPress: () => void };
  eyebrow?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {left && (
          <IconButton glyph={left.glyph} accessibilityLabel={left.label} onPress={left.onPress} />
        )}
      </View>
      {eyebrow ? (
        <Eyebrow tone="muted" numberOfLines={1} style={styles.headerEyebrow}>
          {eyebrow}
        </Eyebrow>
      ) : (
        <View style={styles.headerEyebrow} />
      )}
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

/** Eyebrow over a display headline over a rule that draws itself — the page opener. */
export function PageTitle({
  eyebrow,
  title,
  rule = true,
  size,
  style,
}: {
  eyebrow?: string;
  title: string;
  rule?: boolean;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.pageTitle, style]}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Headline size={size}>{title}</Headline>
      {rule && <Rule style={styles.pageRule} />}
    </View>
  );
}

/** A square hairline panel. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ground = useGround();
  return <View style={[styles.panel, { borderColor: ground.hairline }, style]}>{children}</View>;
}

/**
 * A floating ink card for transient moments — the streak, a reminder ask,
 * a tip, a toast. Ink over cream is the loudest the brand gets.
 */
export function FloatingCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <GroundProvider ground="ink">
      <View style={[styles.floating, style]}>{children}</View>
    </GroundProvider>
  );
}

/** A modal dialog: a square cream sheet over the ink scrim, closable by glyph. */
export function Dialog({
  visible,
  onClose,
  closeLabel = 'Close',
  children,
}: {
  visible: boolean;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GroundProvider ground="cream">
        <View style={styles.scrim}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            <Grain />
            <IconButton
              glyph="close"
              accessibilityLabel={closeLabel}
              onPress={onClose}
              style={styles.dialogClose}
            />
          </View>
        </View>
      </GroundProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  grain: { width: undefined, height: undefined, pointerEvents: 'none' },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s,
  },
  headerSide: { width: 88, flexDirection: 'row' },
  headerRight: { justifyContent: 'flex-end' },
  headerEyebrow: { flex: 1, textAlign: 'center' },
  pageTitle: { gap: space.s },
  pageRule: { marginTop: space.s },
  panel: { borderWidth: layout.hairline },
  floating: {
    backgroundColor: brand.ink,
    padding: space.m,
    boxShadow: '0 14px 34px rgba(24, 51, 77, 0.28)',
  },
  scrim: {
    flex: 1,
    backgroundColor: scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.m,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    backgroundColor: brand.cream,
    overflow: 'hidden',
  },
  dialogScroll: { padding: space.l, paddingTop: space.xl },
  dialogClose: { position: 'absolute', top: space.xs, right: space.xs },
});
