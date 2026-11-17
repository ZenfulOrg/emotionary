import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import * as Speech from 'expo-speech';

import { PronunciationButton } from '@/components/pronunciation-button';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-speech', () => ({
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
  pause: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/feedback/haptics', () => ({ selectionHaptic: jest.fn() }));
jest.mock('@/components/brand/Glyph', () => ({ Glyph: () => null }));

describe('PronunciationButton', () => {
  let renderer: ReactTestRenderer;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(Speech.pause).mockResolvedValue();
    jest.mocked(Speech.resume).mockResolvedValue();
    jest.mocked(Speech.stop).mockResolvedValue();
    await act(async () => {
      renderer = create(<PronunciationButton word="rumination" />);
    });
  });

  afterEach(() => {
    act(() => renderer.unmount());
  });

  const press = async () => {
    const button = renderer.root.findByProps({ accessibilityRole: 'button' });
    await act(async () => {
      button.props.onPress();
      await Promise.resolve();
    });
  };

  it('plays, pauses, resumes, and returns to idle when speech finishes', async () => {
    expect(renderer.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Play pronunciation of rumination',
    );

    await press();
    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith(
      'rumination',
      expect.objectContaining({
        language: 'en-US',
        useApplicationAudioSession: true,
        volume: 1,
      }),
    );
    expect(renderer.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Pause pronunciation of rumination',
    );

    await press();
    expect(Speech.pause).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Resume pronunciation of rumination',
    );

    await press();
    expect(Speech.resume).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledTimes(1);

    const options = (Speech.speak as jest.Mock).mock.calls[0][1];
    act(() => options.onDone());
    expect(renderer.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Play pronunciation of rumination',
    );
  });

  it('stops and resets playback when its Today card is no longer active', async () => {
    await press();
    expect(renderer.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Pause pronunciation of rumination',
    );
    jest.mocked(Speech.stop).mockClear();

    await act(async () => {
      renderer.update(<PronunciationButton word="rumination" active={false} />);
      await Promise.resolve();
    });

    const button = renderer.root.findByProps({ accessibilityRole: 'button' });
    expect(Speech.stop).toHaveBeenCalledTimes(1);
    expect(button.props.accessibilityLabel).toBe('Play pronunciation of rumination');
    // Still tappable: a quick tap on a card that is settling always plays.
    expect(button.props.accessibilityState).toEqual({ selected: false });
    expect(button.props.disabled).toBeUndefined();
  });

  it('resets when a recycled card receives a different word', async () => {
    await press();
    jest.mocked(Speech.stop).mockClear();

    await act(async () => {
      renderer.update(<PronunciationButton word="meraki" />);
      await Promise.resolve();
    });

    const button = renderer.root.findByProps({ accessibilityRole: 'button' });
    expect(Speech.stop).toHaveBeenCalledTimes(1);
    expect(button.props.accessibilityLabel).toBe('Play pronunciation of meraki');
  });

  it('falls back to stopping when native pause is unavailable', async () => {
    jest.mocked(Speech.pause).mockRejectedValueOnce(new Error('unavailable'));

    await press();
    await press();

    expect(Speech.stop).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Play pronunciation of rumination',
    );
  });
});

describe('PronunciationButton audio', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Audio = require('expo-audio') as { setAudioModeAsync: jest.Mock; createAudioPlayer: jest.Mock };

  it('sets the session to play in silent mode', async () => {
    // The mode is set once per app session, so load a fresh module copy.
    let Fresh!: typeof PronunciationButton;
    let FreshAudio!: { setAudioModeAsync: jest.Mock };
    jest.isolateModules(() => {
      jest.doMock('react', () => React);
      /* eslint-disable @typescript-eslint/no-require-imports */
      Fresh = require('@/components/pronunciation-button').PronunciationButton;
      FreshAudio = require('expo-audio');
      /* eslint-enable @typescript-eslint/no-require-imports */
    });
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<Fresh word="saudade" language="Portuguese" />);
    });
    expect(FreshAudio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: true, interruptionMode: 'duckOthers' }),
    );
    act(() => renderer.unmount());
  });

  it('prefers a recording over speech', async () => {
    const player = {
      addListener: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      currentTime: 0,
    };
    Audio.createAudioPlayer.mockReturnValue(player);
    jest.mocked(Speech.speak).mockClear();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<PronunciationButton word="saudade" audioUrl="https://example.com/s.mp3" />);
    });
    // Loaded before the tap, so playback starts at once.
    expect(Audio.createAudioPlayer).toHaveBeenCalledWith({ uri: 'https://example.com/s.mp3' });
    expect(player.play).not.toHaveBeenCalled();
    await act(async () => {
      renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
      await Promise.resolve();
    });
    expect(Audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
