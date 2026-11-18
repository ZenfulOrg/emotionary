import { BlurTargetView, BlurView } from 'expo-blur';
import type React from 'react';
import { useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand } from '@/theme/tokens';

/**
 * Content under a real blur on both platforms.
 *
 * On Android, expo-blur only blurs when it is given a `blurTarget` and a blur
 * method; without them it draws a see-through tint, so stand-in text showed
 * plainly under the "blur" (1.8.0 beta). Android 11 and older cannot blur
 * cheaply, so there the content is covered by a near-solid paper wash instead.
 */
export function SoftBlur({
  intensity,
  style,
  children,
  overlay,
}: {
  intensity: number;
  style?: StyleProp<ViewStyle>;
  /** What gets blurred. */
  children: React.ReactNode;
  /** Sharp content drawn over the blur (e.g. a label). */
  overlay?: React.ReactNode;
}) {
  const target = useRef<View>(null);

  if (Platform.OS !== 'android') {
    return (
      <View style={style}>
        {children}
        <BlurView tint="light" intensity={intensity} style={styles.fill} pointerEvents="none">
          {overlay}
        </BlurView>
      </View>
    );
  }

  const canBlur = typeof Platform.Version === 'number' && Platform.Version >= 31;
  return (
    <View style={style}>
      <BlurTargetView ref={target} collapsable={false}>
        {children}
      </BlurTargetView>
      {canBlur ? (
        <BlurView
          tint="light"
          intensity={intensity}
          blurTarget={target}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={styles.fill}
          pointerEvents="none"
        >
          {overlay}
        </BlurView>
      ) : (
        <View style={[styles.fill, styles.wash]} pointerEvents="none">
          {overlay}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  wash: { backgroundColor: `${brand.cream}F2` },
});
