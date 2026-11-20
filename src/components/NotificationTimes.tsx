import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip } from '@/components/brand';
import { formatTime, TimeControl } from '@/components/TimeControl';
import { selectionHaptic } from '@/feedback/haptics';
import { MAX_NOTIF_TIMES, sortedNotifTimes, type NotifTime } from '@/store/userStore';
import { space } from '@/theme/tokens';

const minutesOf = (time: NotifTime) => time.hour * 60 + time.minute;

/** A sensible next time: four hours after the last one, on a free slot. */
function nextFreeTime(times: readonly NotifTime[]): NotifTime {
  const taken = new Set(times.map(minutesOf));
  let minutes = (minutesOf(times[times.length - 1]) + 240) % 1440;
  while (taken.has(minutes)) minutes = (minutes + 30) % 1440;
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/**
 * Every reminder time of the day: tap a time to change it with the picker,
 * add up to four, remove any but the last one. The earliest brings the day's
 * word; later ones remind of the same word.
 */
export function NotificationTimes({
  times,
  onChange,
}: {
  times: readonly NotifTime[];
  onChange: (times: NotifTime[]) => void;
}) {
  const sorted = sortedNotifTimes(times);
  // Track the time being edited by its value, so re-sorting keeps it selected.
  const [editing, setEditing] = useState<number>(minutesOf(sorted[0]));
  const editingIndex = Math.max(
    0,
    sorted.findIndex((time) => minutesOf(time) === editing),
  );
  const current = sorted[editingIndex];

  const change = (next: NotifTime) => {
    const others = sorted.filter((_, index) => index !== editingIndex);
    // Picking a time that's already in the list just selects that one.
    if (others.some((time) => minutesOf(time) === minutesOf(next))) {
      setEditing(minutesOf(next));
      onChange(others);
      return;
    }
    setEditing(minutesOf(next));
    onChange(sortedNotifTimes([...others, next]));
  };

  const add = () => {
    const next = nextFreeTime(sorted);
    setEditing(minutesOf(next));
    onChange(sortedNotifTimes([...sorted, next]));
  };

  const remove = () => {
    const rest = sorted.filter((_, index) => index !== editingIndex);
    setEditing(minutesOf(rest[0]));
    onChange(rest);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Your notification times">
        {sorted.map((time, index) => (
          <Chip
            key={minutesOf(time)}
            label={formatTime(time)}
            role="radio"
            selected={index === editingIndex}
            accessibilityLabel={`${formatTime(time)}${index === 0 ? ', the daily word' : ', a reminder'}. Change.`}
            onPress={() => {
              selectionHaptic();
              setEditing(minutesOf(time));
            }}
          />
        ))}
      </View>
      <TimeControl value={current} onChange={change} />
      <View style={styles.actions}>
        {sorted.length < MAX_NOTIF_TIMES && (
          <Button label="Add another time" glyph="plus" variant="link" onPress={add} />
        )}
        {sorted.length > 1 && (
          <Button
            label={`Remove ${formatTime(current)}`}
            variant="link"
            onPress={remove}
            accessibilityLabel={`Remove the ${formatTime(current)} notification`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space.l },
});
