import { Redirect, Tabs } from 'expo-router';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';

import { Glyph, type GlyphName } from '@/components/brand';
import { selectionHaptic } from '@/feedback/haptics';
import { STATS_OPEN_EVENT } from '@/stats/events';
import { useUserStore } from '@/store/userStore';
import { brand, font, grounds, tracking } from '@/theme/tokens';

/** The phone nav, as on the site: ○ ⌁ ♡ — and an acid dot on the page you're on. */
function TabGlyph({ name, color, focused }: { name: GlyphName; color: string; focused: boolean }) {
  return (
    <View style={styles.glyph}>
      <Glyph name={name} size={22} color={color} />
      <View style={[styles.dot, focused && styles.dotOn]} />
    </View>
  );
}

export default function TabsLayout() {
  const onboarded = useUserStore((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenListeners={({ route }) => ({
        tabPress: () => {
          selectionHaptic();
          if (route.name === 'stats') {
            DeviceEventEmitter.emit(STATS_OPEN_EVENT);
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.ink,
        tabBarInactiveTintColor: grounds.cream.textMuted,
        tabBarStyle: {
          backgroundColor: brand.cream,
          borderTopColor: grounds.cream.hairline,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: tracking(10, 0.16),
          textTransform: 'uppercase',
        },
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: "Today's word",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="home" color={color as string} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarAccessibilityLabel: 'Browse every word',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="spark" color={color as string} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarAccessibilityLabel: 'Your stats and saved words',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="heart" color={color as string} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glyph: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: -7, top: 1, width: 4, height: 4, borderRadius: 2 },
  dotOn: { backgroundColor: brand.acid },
});
