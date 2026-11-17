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
  /**
   * False while the card is off screen (or scrolling away): stops playback.
   * The button itself stays tappable, so a quick tap always plays.
   */
  active?: boolean;
}) {
  return (
    <PronunciationButtonControl
      key={`${word}:${audioUrl ?? ''}`}
      word={word}
      language={language}
      audioUrl={audioUrl ?? null}
      tint={tint}
      active={active}
    />
  );
}

type Playback = 'idle' | 'playing' | 'paused';

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
  const [playback, setPlayback] = useState<Playback>('idle');
  const playbackRef = useRef<Playback>('idle');
  const speakingRef = useRef(false);
  const sessionRef = useRef(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const startedRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferredLocale = speechLocaleFor(language ?? '');

  const show = (next: Playback) => {
    playbackRef.current = next;
    setPlayback(next);
  };

  const clearFallback = () => {
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
  };

  /**
   * The recording's player, created (and buffering) before the first tap so
   * playback starts the moment the button is pressed.
   */
  const ensurePlayer = (): AudioPlayer | null => {
    if (!audioUrl) return null;
    if (playerRef.current) return playerRef.current;
    const player = createAudioPlayer({ uri: audioUrl });
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.playing) startedRef.current = true;
      if (status.didJustFinish) {
        clearFallback();
        if (playbackRef.current !== 'idle') show('idle');
      }
    });
    playerRef.current = player;
    return player;
  };

  useEffect(() => {
    ensurePlaybackMode();
    if (preferredLocale !== DEFAULT_LOCALE) prefetchVoices();
  }, [preferredLocale]);

  // Preload the recording for the card on screen.
  useEffect(() => {
    if (active) ensurePlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, audioUrl]);

  const stopAll = () => {
    sessionRef.current += 1;
    clearFallback();
    if (speakingRef.current) void Speech.stop();
    speakingRef.current = false;
    playerRef.current?.pause();
  };

  // Scrolled away: stop, ready to play again from the start.
  useEffect(() => {
    if (active || playbackRef.current === 'idle') return;
    stopAll();
    show('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(
    () => () => {
      stopAll();
      playerRef.current?.remove();
      playerRef.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const speak = (session: number) => {
    const locale =
      preferredLocale === DEFAULT_LOCALE ? DEFAULT_LOCALE : resolveLocale(preferredLocale, voiceLocales ?? []);
    const done = () => {
      if (sessionRef.current !== session) return;
      speakingRef.current = false;
      show('idle');
    };
    speakingRef.current = true;
    Speech.speak(word, {
      language: locale,
      // Native voices sound most natural nearer normal speed.
      rate: locale === DEFAULT_LOCALE ? 0.76 : 0.82,
      pitch: 1,
      volume: 1,
      useApplicationAudioSession: true,
      onDone: done,
      onStopped: done,
      onError: done,
    });
  };

  const playRecording = (player: AudioPlayer, session: number) => {
    startedRef.current = false;
    // Offline or a broken file: read the word instead of staying silent.
    fallbackRef.current = setTimeout(() => {
      if (startedRef.current || sessionRef.current !== session) return;
      player.pause();
      speak(session);
    }, RECORDING_LOAD_TIMEOUT_MS);
    player.play();
  };

  const toggle = async () => {
    selectionHaptic();
    ensurePlaybackMode();
    const player = playerRef.current;
    const usingPlayer = Boolean(player) && !speakingRef.current;

    if (playback === 'playing') {
      if (usingPlayer && player) {
        player.pause();
        show('paused');
        return;
      }
      try {
        await Speech.pause();
        show('paused');
      } catch {
        // Android does not expose native speech pause/resume. Stopping is the
        // safest fallback there and keeps the control usable instead of throwing.
        stopAll();
        show('idle');
      }
      return;
    }
    if (playback === 'paused') {
      if (usingPlayer && player) {
        player.play();
        show('playing');
        return;
      }
      try {
        await Speech.resume();
        show('playing');
      } catch {
        stopAll();
        show('idle');
      }
      return;
    }

    stopAll();
    const session = sessionRef.current;
    show('playing');
    const recording = ensurePlayer();
    if (!recording) {
      // Clears anything still speaking (another card's word).
      await Speech.stop();
      if (sessionRef.current === session) speak(session);
      return;
    }
    // Replays start from the top (a finished or stopped recording sits at its end).
    if (recording.currentTime > 0) await recording.seekTo(0).catch(() => {});
    if (sessionRef.current === session) playRecording(recording, session);
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
      <Glyph name={playback === 'playing' ? 'pause' : 'listen'} size={22} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.58 },
});
