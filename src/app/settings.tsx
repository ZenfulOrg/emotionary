import Constants from 'expo-constants';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount, getAuthAccount, signOut, type AuthAccount } from '@/auth/client';
import { SystemIcon } from '@/components/system-icon';
import { selectionHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color, font, space, type } from '@/theme/tokens';

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
    <SafeAreaView style={styles.backdrop} edges={['top']}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.accountBlock}>
            <Text style={styles.accountTitle}>{account?.email ?? (hasFullAccess ? 'Emotionary Pro' : 'Guest')}</Text>
            <Text style={styles.accountSubtitle}>
              {account ? 'Signed in' : hasFullAccess ? 'Full access is active' : 'Using Emotionary free'}
            </Text>
          </View>

          <Text style={styles.section}>ACCOUNT</Text>
          <View style={styles.group}>
            <SettingsRow
              label="Account"
              value={account?.email ?? 'Sign In'}
              onPress={account ? undefined : () => router.push('/account' as Href)}
              chevron={!account}
            />
            <SettingsRow
              label="Emotionary Pro"
              value={hasFullAccess ? 'Active' : 'Upgrade'}
              onPress={hasFullAccess ? undefined : () => router.push('/paywall' as Href)}
              chevron={!hasFullAccess}
            />
            <SettingsRow label="Restore Purchases" onPress={restore} chevron />
            {account && (
              <>
                <SettingsRow label="Sign Out" onPress={accountBusy ? undefined : confirmSignOut} chevron />
                <SettingsRow
                  label={accountBusy ? 'Working…' : 'Delete Account'}
                  onPress={accountBusy ? undefined : confirmDeleteAccount}
                  danger
                  chevron
                />
              </>
            )}
          </View>

          <Text style={styles.section}>PREFERENCES</Text>
          <View style={styles.group}>
            <SettingsRow
              label="Daily Reminder"
              control={
                <Switch
                  value={notifEnabled}
                  onValueChange={(value) => void toggleNotifications(value)}
                  trackColor={{ false: color.hairline, true: color.ink }}
                  thumbColor={color.card}
                />
              }
            />
            <SettingsRow
              label="Haptics"
              control={
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: color.hairline, true: color.ink }}
                  thumbColor={color.card}
                />
              }
            />
            <SettingsRow
              label="Notifications"
              value={notifEnabled ? 'On' : 'Off'}
              onPress={() => void Linking.openSettings()}
              chevron
            />
          </View>

          <Text style={styles.section}>MORE</Text>
          <View style={styles.group}>
            <SettingsRow
              label="Rate Emotionary"
              onPress={() => Alert.alert('Thank you', 'Rating will be available when Emotionary is public on the App Store.')}
              chevron
            />
            <SettingsRow
              label="Send Feedback"
              onPress={() => void Linking.openURL('mailto:hello@emotionarybook.com?subject=Emotionary%20feedback')}
              chevron
            />
            <SettingsRow
              label="Privacy Policy"
              onPress={() => router.push('/legal/privacy' as Href)}
              chevron
            />
            <SettingsRow
              label="Terms of Use"
              onPress={() => router.push('/legal/terms' as Href)}
              chevron
            />
          </View>

          <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.5.1'}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  chevron = false,
  control,
  danger = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  control?: React.ReactNode;
  danger?: boolean;
}) {
  const content = (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowEnd}>
        {value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
        {control}
        {chevron && <Text style={styles.chevron}>›</Text>}
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">{content}</Pressable>
  ) : content;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#DFDCD5', padding: 10 },
  sheet: { flex: 1, backgroundColor: color.card, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.m },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 26, color: color.ink },
  scroll: { paddingHorizontal: space.l, paddingBottom: space.xl },
  accountBlock: { alignItems: 'center', paddingVertical: space.m },
  accountTitle: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.ink },
  accountSubtitle: { fontFamily: font.serif, fontSize: type.caption, color: color.inkMuted, marginTop: 3 },
  section: { fontFamily: font.serifMedium, fontSize: 10, letterSpacing: 1.8, color: color.inkFaint, marginTop: space.l, marginBottom: space.s, paddingLeft: space.s },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline, backgroundColor: '#FFFEFB', overflow: 'hidden' },
  row: { minHeight: 55, paddingHorizontal: space.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.hairline },
  rowLabel: { fontFamily: font.serif, fontSize: type.small, color: color.ink },
  rowLabelDanger: { color: '#A33D39' },
  rowEnd: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.s, marginLeft: space.s },
  rowValue: { flexShrink: 1, fontFamily: font.serif, fontSize: type.small, color: color.inkMuted },
  chevron: { fontFamily: font.serif, fontSize: 25, color: color.inkFaint, lineHeight: 28 },
  version: { fontFamily: font.serif, fontSize: type.caption, color: color.inkFaint, textAlign: 'center', marginTop: space.xl },
});
