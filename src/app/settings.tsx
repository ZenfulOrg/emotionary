import Constants from 'expo-constants';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { deleteAccount, getAuthAccount, signOut, type AuthAccount } from '@/auth/client';
import { Body, Eyebrow, Glyph, Headline, Mono, Panel, Screen, ScreenHeader, Wordmark } from '@/components/brand';
import { selectionHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { useGround } from '@/theme/ground';
import { brand, grounds, layout, space } from '@/theme/tokens';

export default function SettingsScreen() {
  const notifEnabled = useUserStore((state) => state.notifEnabled);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useUserStore((state) => state.setHapticsEnabled);
  const hasFullAccess = useUserStore((state) => state.accessLevel === 'full');
  const unlockFullAccess = useUserStore((state) => state.unlockFullAccess);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getAuthAccount().then(setAccount);
    }, []),
  );

  const toggleNotifications = async (next: boolean) => {
    selectionHaptic();
    if (!next) return setNotifEnabled(false);
    const granted = await requestPermission();
    setNotifEnabled(granted);
    if (!granted && process.env.EXPO_OS !== 'web') {
      warningHaptic();
      Alert.alert('Notifications are off', 'Enable Emotionary notifications in system settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ]);
    }
  };

  const restore = () => {
    selectionHaptic();
    unlockFullAccess();
    successHaptic();
    Alert.alert('Full access restored', 'This beta now has Emotionary Pro access.');
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your favorites and progress will stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: () => {
          setAccountBusy(true);
          void signOut()
            .then(() => {
              setAccount(null);
              successHaptic();
            })
            .catch((error) => Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Try again.'))
            .finally(() => setAccountBusy(false));
        },
      },
    ]);
  };

  const confirmDeleteAccount = () => {
    warningHaptic();
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your Emotionary account. Favorites and progress saved on this device will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            setAccountBusy(true);
            void deleteAccount()
              .then(() => {
                setAccount(null);
                successHaptic();
                Alert.alert('Account deleted', 'Your Emotionary account has been permanently deleted.');
              })
              .catch((error) => {
                warningHaptic();
                Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Try again.');
              })
              .finally(() => setAccountBusy(false));
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        left={{ glyph: 'close', label: 'Close settings', onPress: () => router.back() }}
        eyebrow="Settings"
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.accountBlock}>
          <Eyebrow>{account ? 'Signed in as' : hasFullAccess ? 'Full access is active' : 'Using Emotionary free'}</Eyebrow>
          <Headline size={34} numberOfLines={1} adjustsFontSizeToFit>
            {account?.email ?? (hasFullAccess ? 'Emotionary Pro' : 'Guest')}
          </Headline>
        </View>

        <SettingsGroup index="01" title="Account">
          <SettingsRow
            label="Account"
            value={account?.email ?? 'Sign in'}
            onPress={account ? undefined : () => router.push('/account' as Href)}
          />
          <SettingsRow
            label="Emotionary Pro"
            value={hasFullAccess ? 'Active' : 'Upgrade'}
            onPress={hasFullAccess ? undefined : () => router.push('/paywall' as Href)}
          />
          <SettingsRow label="Restore purchases" onPress={restore} />
          {account && (
            <>
              <SettingsRow label="Sign out" onPress={accountBusy ? undefined : confirmSignOut} />
              <SettingsRow
                label={accountBusy ? 'Working…' : 'Delete account'}
                onPress={accountBusy ? undefined : confirmDeleteAccount}
                danger
              />
            </>
          )}
        </SettingsGroup>

        <SettingsGroup index="02" title="Preferences">
          <SettingsRow
            label="Daily reminder"
            control={
              <Switch
                value={notifEnabled}
                onValueChange={(value) => void toggleNotifications(value)}
                trackColor={{ false: grounds.cream.hairline, true: brand.ink }}
                thumbColor={brand.cream}
                ios_backgroundColor={grounds.cream.hairline}
                accessibilityLabel="Daily reminder"
              />
            }
          />
          <SettingsRow
            label="Haptics"
            control={
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: grounds.cream.hairline, true: brand.ink }}
                thumbColor={brand.cream}
                ios_backgroundColor={grounds.cream.hairline}
                accessibilityLabel="Haptics"
              />
            }
          />
          <SettingsRow
            label="Notifications"
            value={notifEnabled ? 'On' : 'Off'}
            onPress={() => void Linking.openSettings()}
            leaves
          />
        </SettingsGroup>

        <SettingsGroup index="03" title="More">
          <SettingsRow
            label="Rate Emotionary"
            onPress={() => Alert.alert('Thank you', 'Rating will be available when Emotionary is public on the App Store.')}
          />
          <SettingsRow
            label="Send feedback"
            onPress={() => void Linking.openURL('mailto:hello@emotionarybook.com?subject=Emotionary%20feedback')}
            leaves
          />
          <SettingsRow label="Privacy policy" onPress={() => router.push('/legal/privacy' as Href)} />
          <SettingsRow label="Terms of use" onPress={() => router.push('/legal/terms' as Href)} />
        </SettingsGroup>

        <View style={styles.footer}>
          <Wordmark size={28} />
          <Mono size={11} tone="muted">
            VERSION {Constants.expoConfig?.version ?? ''}
          </Mono>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SettingsGroup({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Eyebrow tone="muted" style={styles.groupTitle}>
        {index} / {title}
      </Eyebrow>
      <Panel>{children}</Panel>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  control,
  danger = false,
  leaves = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  control?: ReactNode;
  danger?: boolean;
  /** the action leaves the app */
  leaves?: boolean;
}) {
  const ground = useGround();
  const content = (
    <View style={[styles.row, { borderBottomColor: ground.hairline }]}>
      {danger && <View style={styles.dangerDot} />}
      <Body size={18} style={styles.rowLabel}>
        {label}
      </Body>
      <View style={styles.rowEnd}>
        {value && (
          <Mono size={12} tone="muted" numberOfLines={1} style={styles.rowValue}>
            {value}
          </Mono>
        )}
        {control}
        {onPress && <Glyph name={leaves ? 'leaves' : 'forward'} size={16} color={ground.textMuted} />}
      </View>
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole={leaves ? 'link' : 'button'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => pressed && { backgroundColor: ground.wash }}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible={!control} accessibilityLabel={value ? `${label}, ${value}` : undefined}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl },
  accountBlock: { gap: space.xs, paddingTop: space.m, paddingBottom: space.s },
  group: { marginTop: space.xl },
  groupTitle: { marginBottom: space.s },
  row: {
    minHeight: 56,
    paddingHorizontal: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    borderBottomWidth: 1,
    marginBottom: -1,
  },
  rowLabel: { flexShrink: 1, paddingVertical: space.s },
  dangerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.rust },
  rowEnd: { flexGrow: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.s },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  footer: { alignItems: 'center', gap: space.s, marginTop: space.xxl },
});
