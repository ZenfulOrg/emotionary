import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Glyph } from '@/components/brand/Glyph';
import { selectionHaptic } from '@/feedback/haptics';

export function PronunciationButton({
  word,
  tint,
  active = true,
}: {
  word: string;
  /** defaults to the ground's text color */
  tint?: string;
  active?: boolean;
}) {
  return (
    <PronunciationButtonControl
      key={`${word}:${active ? 'active' : 'inactive'}`}
      word={word}
      tint={tint}
      active={active}
    />
  );
}

function PronunciationButtonControl({
  word,
  tint,
  active,
}: {
  word: string;
  tint?: string;
  active: boolean;
}) {
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'paused'>('idle');
  const activeRef = useRef(false);
  const sessionRef = useRef(0);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      if (activeRef.current) void Speech.stop();
      activeRef.current = false;
    },
    [],
  );

  const toggle = async () => {
    if (!active) return;
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
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    activeRef.current = true;
    setPlayback('playing');
    Speech.speak(word, {
      language: 'en-US',
      rate: 0.76,
      pitch: 1,
      volume: 1,
      useApplicationAudioSession: true,
      onDone: () => {
        if (sessionRef.current !== session) return;
        activeRef.current = false;
        setPlayback('idle');
      },
      onStopped: () => {
        if (sessionRef.current !== session) return;
        activeRef.current = false;
        setPlayback('idle');
      },
      onError: () => {
        if (sessionRef.current !== session) return;
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
      accessibilityState={{ disabled: !active, selected: playback !== 'idle' }}
      disabled={!active}
      hitSlop={8}
    >
      <Glyph name={playback === 'playing' ? 'pause' : 'listen'} size={18} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.58 },
});
