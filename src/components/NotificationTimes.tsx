import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Chip } from '@/components/brand';
import { formatTime, TimeControl } from '@/components/TimeControl';
import { warningHaptic } from '@/feedback/haptics';
import { MAX_NOTIF_TIMES, sortedNotifTimes, type NotifTime } from '@/store/userStore';
import { space } from '@/theme/tokens';

/** The quick times, in the order onboarding has always shown them. */
export const QUICK_TIMES: NotifTime[] = [
  { hour: 11, minute: 11 },
  { hour: 7, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 0 },
];

const minutesOf = (time: NotifTime) => time.hour * 60 + time.minute;
const same = (a: NotifTime, b: NotifTime) => minutesOf(a) === minutesOf(b);

/**
 * The reminder times as chips: tap one or more (up to four), tap again to
 * remove it. The earliest brings the day's word; later ones remind of it.
 * The wheel sets a time of your own for the chip last picked; on Stats it
 * stays hidden behind "Other time" until asked for.
 */
export function NotificationTimes({
  times,
  onChange,
  picker = 'always',
  hint,
}: {
  times: readonly NotifTime[];
  onChange: (times: NotifTime[]) => void;
  picker?: 'always' | 'onDemand';
  /** A fixed line under the chips in place of the default guidance. */
  hint?: string;
}) {
  const selected = sortedNotifTimes(times);
  const [active, setActive] = useState<NotifTime>(selected[selected.length - 1] ?? QUICK_TIMES[0]);
  const [pickerOpen, setPickerOpen] = useState(picker === 'always');
  // Times of one's own (from the wheel) show as chips too, so they can be removed.
  const chips = [...QUICK_TIMES, ...selected.filter((time) => !QUICK_TIMES.some((quick) => same(quick, time)))];
  const current = selected.find((time) => same(time, active)) ?? selected[selected.length - 1];

  const toggle = (time: NotifTime) => {
    if (selected.some((t) => same(t, time))) {
      if (selected.length === 1) return; // always at least one
      const rest = selected.filter((t) => !same(t, time));
      setActive(rest[rest.length - 1]);
      onChange(rest);
      return;
    }
    if (selected.length >= MAX_NOTIF_TIMES) {
      warningHaptic();
      return;
    }
    setActive(time);
    onChange(sortedNotifTimes([...selected, time]));
  };

  // The wheel changes the time last picked into a time of one's own.
  const setOwnTime = (next: NotifTime) => {
    const others = selected.filter((t) => !same(t, current));
    // Spinning past a time that's already picked doesn't merge the two.
    if (others.some((t) => same(t, next))) return;
    setActive(next);
    onChange(sortedNotifTimes([...others, next]));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chips} accessibilityLabel="Notification times">
        {chips.map((time) => (
          <Chip
            key={minutesOf(time)}
            label={formatTime(time)}
            selected={selected.some((t) => same(t, time))}
            onPress={() => toggle(time)}
          />
        ))}
        {picker === 'onDemand' && (
          <Chip
            label={pickerOpen ? 'Done' : 'Other time'}
            selected={false}
            onPress={() => setPickerOpen((open) => !open)}
            accessibilityLabel={pickerOpen ? 'Hide the time wheel' : 'Choose another time'}
          />
        )}
      </View>
      <Body size={15} tone="muted" style={styles.hint}>
        {hint ??
          (selected.length > 1
            ? 'Your word comes at the first time; the others remind you of it.'
            : 'Pick more than one for a reminder later in the day.')}
      </Body>
      {pickerOpen && (
        <View style={styles.picker}>
          <TimeControl value={current} onChange={setOwnTime} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  chips: { justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  hint: { marginTop: space.s, textAlign: 'center', maxWidth: 320 },
  picker: { marginTop: space.m, alignItems: 'center' },
});
