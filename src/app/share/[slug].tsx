import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, PixelRatio, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findWord, useContentStore } from '@/content/store';
import { Button, Eyebrow, IconButton, Mono, Separator, useGroundStatusBar } from '@/components/brand';
import { localDateString, wordOfDay } from '@/daily/engine';
import { canViewWord } from '@/entitlements';
import { lightImpactHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';
import { CARD_BASE_HEIGHT, CARD_BASE_WIDTH, ShareCard } from '@/share/ShareCard';
import { useUserStore } from '@/store/userStore';
import { GroundProvider } from '@/theme/ground';
import { grounds, layout, scrim, space } from '@/theme/tokens';

/** Every target opens the system share sheet with the card attached. */
const SHARE_TARGETS = ['Messages', 'Instagram', 'Facebook', 'WhatsApp'] as const;

export default function ShareModal() {
  const { slug, demo } = useLocalSearchParams<{ slug: string; demo?: string }>();
  const words = useContentStore((s) => s.words);
  const recordShare = useUserStore((s) => s.recordShare);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const { width: winW, height: winH } = useWindowDimensions();
  useGroundStatusBar('ink');
  const insets = useSafeAreaInsets();

  const shotRef = useRef<View>(null);
  const [laidOut, setLaidOut] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'sharing'>('idle');
  const [saved, setSaved] = useState(false);

  const word = slug ? findWord(words, slug) : undefined;
  const todaysSlug = wordOfDay(words, localDateString())?.slug ?? null;
  const locked = word ? demo !== '1' && !canViewWord(word, todaysSlug, hasFullAccess) : false;

  useEffect(() => {
    if (locked) router.replace('/paywall');
  }, [locked]);

  if (!word) {
    router.back();
    return null;
  }
  if (locked) return null;

  // Fit the 9:16 preview inside the window with room for the buttons.
  const cardWidth = Math.min(winW * 0.7, (winH * 0.56 * CARD_BASE_WIDTH) / CARD_BASE_HEIGHT);
  const pixelRatio = PixelRatio.get();
  const captureWidth = CARD_BASE_WIDTH / pixelRatio;
  const captureHeight = CARD_BASE_HEIGHT / pixelRatio;

  // Native-only modules are imported lazily inside the handlers — a static
  // import of expo-media-library breaks web/server rendering (its classes
  // extend a native module that is undefined off-device).
  //
  // captureRef measures width/height in logical points and then multiplies by
  // the device scale. Render a dedicated full-size capture surface so the PNG
  // lands at a sharp, exact 1080×1920 pixels instead of enlarging the preview.
  const capture = async () => {
    const { captureRef } = await import('react-native-view-shot');
    return captureRef(shotRef, {
      format: 'png',
      quality: 1,
      width: captureWidth,
      height: captureHeight,
    });
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
      const Sharing = await import('expo-sharing');
      const uri = await capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this word' });
      recordShare(word.slug, localDateString());
      successHaptic();
    } catch {
      warningHaptic();
      Alert.alert('Something went wrong', 'The card could not be shared. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  const ready = laidOut && busy === 'idle';

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
            <View
              style={styles.cardFrame}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Share card for ${word.word}: ${word.definition}`}
            >
              <ShareCard word={word} width={cardWidth} />
            </View>
          </View>

          <View
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
            <ShareCard word={word} width={captureWidth} />
          </View>

          <View style={styles.buttons}>
            <Button
              label={busy === 'saving' ? 'Saving…' : saved ? 'Saved' : 'Download'}
              glyph={saved ? 'check' : 'scrolls'}
              variant="outline"
              onPress={() => void onDownload()}
              disabled={!ready}
              haptic={false}
              accessibilityLabel={saved ? 'Saved to Photos' : 'Download to Photos'}
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
          <View style={styles.targets}>
            {SHARE_TARGETS.map((target, index) => (
              <View key={target} style={styles.target}>
                {index > 0 && <Separator />}
                <Pressable
                  onPress={() => void onShare()}
                  disabled={!ready}
                  accessibilityRole="button"
                  accessibilityLabel={`Share to ${target}`}
                  accessibilityState={{ disabled: !ready }}
                  style={({ pressed }) => [styles.targetButton, (pressed || !ready) && styles.dim]}
                >
                  <Eyebrow tone="default" size={10} style={styles.targetLabel}>
                    {target}
                  </Eyebrow>
                </Pressable>
              </View>
            ))}
          </View>
          <Mono size={11} tone="faint" style={styles.caption}>
            SIZED FOR STORIES · 1080 × 1920
          </Mono>
        </View>
      </View>
    </GroundProvider>
  );
}

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
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  targets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.s,
  },
  target: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  targetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  targetLabel: { textDecorationLine: 'underline', letterSpacing: 1.2 },
  dim: { opacity: 0.6 },
  caption: { textAlign: 'center', marginTop: space.xs, marginBottom: space.s },
});
