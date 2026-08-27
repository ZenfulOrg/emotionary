import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SystemIcon } from '@/components/system-icon';
import { selectionHaptic } from '@/feedback/haptics';
import { color } from '@/theme/tokens';

export function PronunciationButton({ word, tint = color.inkMuted }: { word: string; tint?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(
    () => () => {
      if (speakingRef.current) void Speech.stop();
    },
    [],
  );

  const toggle = async () => {
    selectionHaptic();
    if (speaking) {
      await Speech.stop();
      speakingRef.current = false;
      setSpeaking(false);
      return;
    }

    await Speech.stop();
    speakingRef.current = true;
    setSpeaking(true);
    Speech.speak(word, {
      language: 'en-US',
      rate: 0.76,
      pitch: 1,
      onDone: () => {
        speakingRef.current = false;
        setSpeaking(false);
      },
      onStopped: () => {
        speakingRef.current = false;
        setSpeaking(false);
      },
      onError: () => {
        speakingRef.current = false;
        setSpeaking(false);
      },
    });
  };

  return (
    <Pressable
      onPress={() => void toggle()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${speaking ? 'Stop' : 'Play'} pronunciation of ${word}`}
      accessibilityState={{ selected: speaking }}
      hitSlop={8}
    >
      <SystemIcon
        name={speaking ? 'pause.circle.fill' : 'speaker.wave.2.fill'}
        fallback={speaking ? 'Ⅱ' : '▶'}
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
