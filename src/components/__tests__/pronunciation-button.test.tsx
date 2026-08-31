import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import * as Speech from 'expo-speech';

import { PronunciationButton } from '@/components/pronunciation-button';

jest.mock('expo-speech', () => ({
  pause: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/feedback/haptics', () => ({ selectionHaptic: jest.fn() }));
jest.mock('@/components/system-icon', () => ({ SystemIcon: () => null }));

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
    expect(button.props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(button.props.disabled).toBe(true);
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
