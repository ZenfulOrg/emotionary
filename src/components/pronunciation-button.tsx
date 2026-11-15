import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Glyph } from '@/components/brand/Glyph';
import { DEFAULT_LOCALE, resolveLocale, speechLocaleFor } from '@/content/voice';
import { selectionHaptic } from '@/feedback/haptics';

/**
 * Audio session: play pronunciations even with the ring/silent switch on
 * (like a video or podcast would), and only duck, never stop, other audio.
 * Set once, as soon as any pronunciation button exists, so it is in place
 * before the first tap.
 */
let playbackMode: Promise<void> | null = null;
function ensurePlaybackMode(): void {
  playbackMode ??= setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
  }).catch(() => {
    playbackMode = null;
  });
}

/** Locales the device has voices for, fetched once. */
let voiceLocales: string[] | null = null;
let voiceRequest: Promise<void> | null = null;
function prefetchVoices(): void {
  voiceRequest ??= Speech.getAvailableVoicesAsync()
    .then((voices) => {
      voiceLocales = voices.map((voice) => voice.language);
    })
    .catch(() => {
      voiceLocales = [];
    });
}

/** If a recording hasn't started within this long, read the word instead. */
const RECORDING_LOAD_TIMEOUT_MS = 4000;

export function PronunciationButton({
  word,
  language,
  audioUrl,
  tint,
  active = true,
}: {
  word: string;
  /** The word's language; picks a native voice where the device has one. */
  language?: string;
  /** A recorded pronunciation; always preferred over speech. */
  audioUrl?: string | null;
  /** defaults to the ground's text color */
  tint?: string;
  active?: boolean;
}) {
  return (
    <PronunciationButtonControl
      key={`${word}:${active ? 'active' : 'inactive'}`}
      word={word}
      language={language}
      audioUrl={audioUrl ?? null}
      tint={tint}
      active={active}
    />
  );
}

function PronunciationButtonControl({
  word,
  language,
  audioUrl,
  tint,
  active,
}: {
  word: string;
  language?: string;
  audioUrl: string | null;
  tint?: string;
  active: boolean;
}) {
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'paused'>('idle');
  const activeRef = useRef(false);
  const sessionRef = useRef(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const preferredLocale = speechLocaleFor(language ?? '');

  useEffect(() => {
    ensurePlaybackMode();
    if (preferredLocale !== DEFAULT_LOCALE) prefetchVoices();
  }, [preferredLocale]);

  const releasePlayer = () => {
    playerRef.current?.remove();
    playerRef.current = null;
  };

  useEffect(
    () => () => {
      sessionRef.current += 1;
      if (activeRef.current) void Speech.stop();
      activeRef.current = false;
      releasePlayer();
    },
    [],
  );

  const finish = (session: number) => {
    if (sessionRef.current !== session) return;
    activeRef.current = false;
    releasePlayer();
    setPlayback('idle');
  };

  const speak = (session: number) => {
    const locale =
      preferredLocale === DEFAULT_LOCALE ? DEFAULT_LOCALE : resolveLocale(preferredLocale, voiceLocales ?? []);
    Speech.speak(word, {
      language: locale,
      // Native voices sound most natural nearer normal speed.
      rate: locale === DEFAULT_LOCALE ? 0.76 : 0.82,
      pitch: 1,
      volume: 1,
      useApplicationAudioSession: true,
      onDone: () => finish(session),
      onStopped: () => finish(session),
      onError: () => finish(session),
    });
  };

  const playRecording = (url: string, session: number) => {
    const player = createAudioPlayer({ uri: url });
    playerRef.current = player;
    let started = false;
    const fallback = setTimeout(() => {
      if (started || sessionRef.current !== session) return;
      releasePlayer();
      speak(session);
    }, RECORDING_LOAD_TIMEOUT_MS);
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.playing) started = true;
      if (status.didJustFinish) {
        clearTimeout(fallback);
        finish(session);
      }
    });
    player.play();
  };

  const toggle = async () => {
    if (!active) return;
    selectionHaptic();
    ensurePlaybackMode();
    const player = playerRef.current;

    if (playback === 'playing') {
      if (player) {
        player.pause();
        setPlayback('paused');
        return;
      }
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
      if (player) {
        player.play();
        setPlayback('playing');
        return;
      }
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
    releasePlayer();
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    activeRef.current = true;
    setPlayback('playing');
    if (audioUrl) playRecording(audioUrl, session);
    else speak(session);
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
      <Glyph name={playback === 'playing' ? 'pause' : 'listen'} size={22} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.58 },
});
