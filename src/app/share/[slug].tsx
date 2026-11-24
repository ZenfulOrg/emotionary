import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findWord, useContentStore } from '@/content/store';
import {
  Button,
  Eyebrow,
  IconButton,
  Mono,
  useGroundStatusBar,
} from '@/components/brand';
import { localDateString } from '@/daily/engine';
import { useTodaysWord } from '@/daily/useTodaysWord';
import { wordAccess } from '@/entitlements';
import { lightImpactHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';
import { CARD_BASE_HEIGHT, CARD_BASE_WIDTH, ShareCard, SHARE_THEMES } from '@/share/ShareCard';
import { CARD_SHARE_MESSAGE } from '@/invite/invite';
import EmotionaryWidgets from '../../../modules/emotionary-widgets/src/EmotionaryWidgetsModule';
import { useKeptSlugs } from '@/store/useKeptSlugs';
import { useUserStore } from '@/store/userStore';
import { maybeAskForReview } from '@/review/prompt';
import { GroundProvider } from '@/theme/ground';
import { grounds, layout, scrim, space } from '@/theme/tokens';
import { track } from '@/analytics/track';


export default function ShareModal() {
  const { slug, demo } = useLocalSearchParams<{ slug: string; demo?: string }>();
  const words = useContentStore((s) => s.words);
  const recordShare = useUserStore((s) => s.recordShare);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const kept = useKeptSlugs();
  const { width: winW, height: winH } = useWindowDimensions();
  useGroundStatusBar('ink');
  const insets = useSafeAreaInsets();

  const shotRef = useRef<View>(null);
  const carouselRef = useRef<ScrollView>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'sharing'>('idle');
  const [saved, setSaved] = useState(false);

  const word = slug ? findWord(words, slug) : undefined;
  const todaysSlug = useTodaysWord(localDateString())?.slug ?? null;
  // Share cards show the meaning, so they need full access to the word.
  const access = word ? wordAccess(word, todaysSlug, hasFullAccess, kept) : 'full';
  const locked = demo !== '1' && access !== 'full';

  useEffect(() => {
    if (locked)
      router.replace((access === 'teaser' && slug ? `/unlock/${slug}` : '/paywall') as Href);
  }, [locked, access, slug]);

  if (!word) {
    router.back();
    return null;
  }
  if (locked) return null;

  // Fit the 9:16 preview inside the window with room for the buttons.
  const previewHeight = Math.max(160, winH - insets.top - insets.bottom - 300);
  const cardWidth = Math.min(winW * 0.7, (previewHeight * CARD_BASE_WIDTH) / CARD_BASE_HEIGHT);
  // The saved PNG is 2× the 1080×1920 story size (2160×3840): at 1×, phones
  // whose screens are wider than 1080px stretch it and the text looks soft.
  // Instagram and other apps scale it down cleanly.
  const pixelRatio = PixelRatio.get();
  const exportWidth = CARD_BASE_WIDTH * EXPORT_SCALE;
  const exportHeight = CARD_BASE_HEIGHT * EXPORT_SCALE;
  const captureWidth = exportWidth / pixelRatio;
  const captureHeight = exportHeight / pixelRatio;

  // Native-only modules are imported lazily inside the handlers — a static
  // import of expo-media-library breaks web/server rendering (its classes
  // extend a native module that is undefined off-device).
  //
  // captureRef measures width/height in logical points and then multiplies by
  // the device scale. Render a dedicated full-size capture surface so the PNG
  // lands at a sharp, exact 2160×3840 pixels instead of enlarging the preview.
  const capture = async () => {
    const { captureRef } = await import('react-native-view-shot');
    // iOS reads width/height in points; Android reads them as pixels (and
    // truncates to whole numbers), so passing points there saved a blurry
    // ~384px card. Ask Android for the exact pixel size.
    const size =
      Platform.OS === 'android'
        ? { width: exportWidth, height: exportHeight }
        : { width: captureWidth, height: captureHeight };
    // A readable name in the gallery instead of ReactNative-snapshot-image….
    return captureRef(shotRef, { format: 'png', quality: 1, fileName: `Emotionary-${word.slug}-${Date.now()}`, ...size });
  };

  const notAvailableOnWeb = () =>
    Alert.alert('Not available here', 'Saving and sharing cards works in the mobile app.');

  const onDownload = async () => {
    lightImpactHaptic();
    if (Platform.OS === 'web') return notAvailableOnWeb();
    setBusy('saving');
    try {
      const MediaLibrary = await import('expo-media-library');
      // Write-only save — no READ_MEDIA_* permissions (DESIGN.md §10).
      const perm = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!perm.granted) {
        warningHaptic();
        Alert.alert('Permission needed', 'Allow Emotionary to save photos to download word cards.');
        return;
      }
      const uri = await capture();
      await MediaLibrary.Asset.create(uri);
      setSaved(true);
      recordShare(word.slug, localDateString());
      track('word_shared', { slug: word.slug, how: 'download', theme: SHARE_THEMES[themeIndex].id });
      successHaptic();
    } catch {
      warningHaptic();
      Alert.alert('Something went wrong', 'The card could not be saved. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  const onShare = async () => {
    lightImpactHaptic();
    if (Platform.OS === 'web') return notAvailableOnWeb();
    setBusy('sharing');
    try {
      const uri = await capture();
      if (Platform.OS === 'ios') {
        // The card plus a line about the app, so a message arrives with a link.
        const result = await Share.share({ url: uri, message: CARD_SHARE_MESSAGE });
        if (result.action !== Share.sharedAction) return;
      } else if (EmotionaryWidgets?.shareImageWithText) {
        // Android: the card and the same line with the link. Backing out of
        // the share sheet resolves false and is not counted as a share.
        const shared = await EmotionaryWidgets.shareImageWithText(uri, CARD_SHARE_MESSAGE, 'Share this word');
        if (!shared) return;
      } else {
        const Sharing = await import('expo-sharing');
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this word' });
      }
      recordShare(word.slug, localDateString());
      track('word_shared', { slug: word.slug, how: 'share', theme: SHARE_THEMES[themeIndex].id });
      successHaptic();
      // Just shared a card: a good moment to ask for a rating.
      setTimeout(() => void maybeAskForReview(), 800);
    } catch {
      warningHaptic();
      Alert.alert('Something went wrong', 'The card could not be shared. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  const ready = laidOut && !scrolling && busy === 'idle';
  const pageWidth = winW - layout.gutter * 2;
  const theme = SHARE_THEMES[themeIndex];
  const chooseTheme = (index: number) => {
    if (index !== themeIndex) {
      setLaidOut(false);
      setSaved(false);
      setThemeIndex(index);
    }
  };

  return (
    <GroundProvider ground="ink">
      <View style={styles.backdrop}>
        <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Eyebrow>Share a word</Eyebrow>
            <IconButton
              glyph="close"
              accessibilityLabel="Close"
              onPress={() => router.back()}
              style={styles.close}
            />
          </View>

          <View style={styles.preview}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              scrollEnabled={busy === 'idle'}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              onScrollBeginDrag={() => setScrolling(true)}
              onScrollEndDrag={(event) => {
                const { contentOffset, targetContentOffset, velocity } = event.nativeEvent;
                // A drag at an outer edge may finish without any momentum event.
                if (
                  velocity?.x === 0 &&
                  Math.abs((targetContentOffset?.x ?? contentOffset.x) - contentOffset.x) < 1
                ) {
                  chooseTheme(
                    Math.max(
                      0,
                      Math.min(SHARE_THEMES.length - 1, Math.round(contentOffset.x / pageWidth)),
                    ),
                  );
                  setScrolling(false);
                }
              }}
              onMomentumScrollEnd={(event) => {
                chooseTheme(
                  Math.max(
                    0,
                    Math.min(
                      SHARE_THEMES.length - 1,
                      Math.round(event.nativeEvent.contentOffset.x / pageWidth),
                    ),
                  ),
                );
                setScrolling(false);
              }}
              accessibilityLabel="Swipe to choose a share card color"
            >
              {SHARE_THEMES.map((option) => (
                <View key={option.id} style={[styles.previewPage, { width: pageWidth }]}>
                  <View
                    style={styles.cardFrame}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`${option.label} share card for ${word.word}: ${word.definition}`}
                  >
                    <ShareCard word={word} width={cardWidth} theme={option.id} />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
          <View
            style={styles.themeChoices}
            accessibilityRole="radiogroup"
            accessibilityLabel="Card color"
          >
            {SHARE_THEMES.map((option, index) => (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: index === themeIndex, disabled: busy !== 'idle' }}
                disabled={busy !== 'idle'}
                onPress={() => {
                  chooseTheme(index);
                  setScrolling(false);
                  carouselRef.current?.scrollTo({ x: index * pageWidth, animated: false });
                }}
                style={styles.themeChoice}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: option.background },
                    index === themeIndex && styles.selectedSwatch,
                  ]}
                />
                <Mono size={10} tone={index === themeIndex ? 'default' : 'muted'}>
                  {option.label}
                </Mono>
              </Pressable>
            ))}
          </View>

          <View
            key={theme.id}
            ref={shotRef}
            collapsable={false}
            pointerEvents="none"
            onLayout={() => setLaidOut(true)}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.captureSurface,
              {
                width: captureWidth,
                height: captureHeight,
                left: -captureWidth - 20,
              },
            ]}
          >
            <ShareCard word={word} width={captureWidth} theme={theme.id} />
          </View>

          <View style={styles.buttons}>
            <Button
              label={busy === 'saving' ? 'Saving…' : saved ? 'Saved' : 'Download'}
              glyph={saved ? 'check' : 'scrolls'}
              variant="outline"
              onPress={() => void onDownload()}
              disabled={!ready}
              haptic={false}
              accessibilityLabel={Platform.OS === 'android' ? (saved ? 'Saved to gallery' : 'Save to gallery') : saved ? 'Saved to Photos' : 'Download to Photos'}
              style={styles.button}
            />
            <Button
              label={busy === 'sharing' ? 'Sharing…' : 'Share'}
              glyph="leaves"
              onPress={() => void onShare()}
              disabled={!ready}
              haptic={false}
              accessibilityLabel="Share the card"
              style={styles.button}
            />
          </View>
          <Mono size={11} tone="faint" style={styles.caption}>
            SIZED FOR STORIES · 9:16
          </Mono>
        </View>
      </View>
    </GroundProvider>
  );
}

/** Saved cards are this many times the 1080×1920 story size. */
const EXPORT_SCALE = 2;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: scrim },
  safe: { flex: 1, paddingHorizontal: layout.gutter },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { marginRight: -10 },
  preview: { flex: 1 },
  carouselContent: { alignItems: 'center' },
  previewPage: { alignItems: 'center', justifyContent: 'center' },
  themeChoices: { flexDirection: 'row', justifyContent: 'center', gap: space.l },
  themeChoice: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 6 },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: grounds.ink.textFaint,
  },
  selectedSwatch: { borderWidth: 3, borderColor: grounds.ink.eyebrow },
  cardFrame: {
    borderWidth: 1,
    borderColor: grounds.ink.hairline,
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
  },
  captureSurface: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  buttons: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  button: { flex: 1 },
  caption: { textAlign: 'center', marginTop: space.m, marginBottom: space.s },
});
