import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Eyebrow, Headline, IconButton } from '@/components/brand';
import { selectionHaptic } from '@/feedback/haptics';
import type { NotifTime } from '@/store/userStore';
import { useGround } from '@/theme/ground';
import { space } from '@/theme/tokens';

export function formatTime({ hour, minute }: NotifTime): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function toDate({ hour, minute }: NotifTime): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Time-of-day picker: native spinner on iOS, dialog on Android,
 * simple steppers on web (verification surface only).
 */
export function TimeControl({
  value,
  onChange,
}: {
  value: NotifTime;
  onChange: (t: NotifTime) => void;
}) {
  const ground = useGround();
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  if (Platform.OS === 'web') {
    const step = (deltaMinutes: number) => {
      const total = (value.hour * 60 + value.minute + deltaMinutes + 1440) % 1440;
      onChange({ hour: Math.floor(total / 60), minute: total % 60 });
    };
    return (
      <View style={styles.webRow}>
        <IconButton glyph="minus" accessibilityLabel="Thirty minutes earlier" onPress={() => step(-30)} />
        <Headline accessibilityRole="text" size={28}>
          {formatTime(value)}
        </Headline>
        <IconButton glyph="plus" accessibilityLabel="Thirty minutes later" onPress={() => step(30)} />
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View>
        <Pressable
          onPress={() => {
            selectionHaptic();
            setShowAndroidPicker(true);
          }}
          style={styles.androidRow}
          accessibilityRole="button"
          accessibilityLabel={`Delivery time, ${formatTime(value)}. Change.`}
        >
          <Headline accessibilityRole="text" size={28}>
            {formatTime(value)}
          </Headline>
          <Eyebrow tone="default" style={styles.change}>
            Change
          </Eyebrow>
        </Pressable>
        {showAndroidPicker && (
          <DateTimePicker
            value={toDate(value)}
            mode="time"
            onValueChange={(_event, date) => {
              setShowAndroidPicker(false);
              selectionHaptic();
              onChange({ hour: date.getHours(), minute: date.getMinutes() });
            }}
            onDismiss={() => setShowAndroidPicker(false)}
          />
        )}
      </View>
    );
  }

  return (
    <DateTimePicker
      value={toDate(value)}
      mode="time"
      display="spinner"
      textColor={ground.text}
      themeVariant={ground.name === 'ink' ? 'dark' : 'light'}
      style={styles.iosPicker}
      onValueChange={(_event, date) => {
        selectionHaptic();
        onChange({ hour: date.getHours(), minute: date.getMinutes() });
      }}
    />
  );
}

const styles = StyleSheet.create({
  webRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.l },
  androidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m,
    paddingVertical: space.s,
  },
  change: { textDecorationLine: 'underline' },
  iosPicker: { alignSelf: 'center' },
});
