import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SystemIcon } from '@/components/system-icon';
import { selectionHaptic } from '@/feedback/haptics';
import { color } from '@/theme/tokens';

export function PronunciationButton({ word, tint = color.inkMuted }: { word: string; tint?: string }) {
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'paused'>('idle');
  const activeRef = useRef(false);

  useEffect(
    () => () => {
      if (activeRef.current) void Speech.stop();
    },
    [],
  );

  const toggle = async () => {
    selectionHaptic();
    if (playback === 'playing') {
      try {
        await Speech.pause();
        setPlayback('paused');
      } catch {
        // Android does not expose native speech pause/resume. Stopping is the
        // safest fallback there and keeps the control usable instead of throwing.
        await Speech.stop();
        activeRef.current = false;
        setPlayback('idle');
      }
      return;
    }
    if (playback === 'paused') {
      try {
        await Speech.resume();
        setPlayback('playing');
      } catch {
        await Speech.stop();
        activeRef.current = false;
        setPlayback('idle');
      }
      return;
    }

    await Speech.stop();
    activeRef.current = true;
    setPlayback('playing');
    Speech.speak(word, {
      language: 'en-US',
      rate: 0.76,
      pitch: 1,
      onDone: () => {
        activeRef.current = false;
        setPlayback('idle');
      },
      onStopped: () => {
        activeRef.current = false;
        setPlayback('idle');
      },
      onError: () => {
        activeRef.current = false;
        setPlayback('idle');
      },
    });
  };

  const action = playback === 'playing' ? 'Pause' : playback === 'paused' ? 'Resume' : 'Play';

  return (
    <Pressable
      onPress={() => void toggle()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${action} pronunciation of ${word}`}
      accessibilityState={{ selected: playback !== 'idle' }}
      hitSlop={8}
    >
      <SystemIcon
        name={playback === 'playing' ? 'pause.circle.fill' : 'speaker.wave.2.fill'}
        fallback={playback === 'playing' ? 'Ⅱ' : '▶'}
        size={18}
        color={tint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.58 },
});
