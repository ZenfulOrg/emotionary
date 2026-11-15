import { Linking, StyleSheet, View } from 'react-native';

import { STORE_URL, useAppConfigStore, useUpdatePrompt } from '@/app-config/store';
import { Body, Button, Dialog, Eyebrow, Headline, OrbitBackdrop, Screen } from '@/components/brand';
import { space } from '@/theme/tokens';

const STORE_NAME = STORE_URL.includes('apple.com') ? 'the App Store' : 'Google Play';

function openStore() {
  void Linking.openURL(STORE_URL).catch(() => {});
}

/**
 * Soft prompt: a newer store version exists. Shown once per version, always
 * dismissible. Driven by public.app_config; renders nothing by default.
 */
export function UpdateAvailableDialog() {
  const prompt = useUpdatePrompt();
  const dismiss = useAppConfigStore((s) => s.dismiss);
  if (prompt.kind !== 'available') return null;

  const close = () => dismiss(prompt.version);
  return (
    <Dialog visible onClose={close} closeLabel="Not now">
      <Eyebrow>Version {prompt.version}</Eyebrow>
      <Headline size={34} style={styles.title}>
        A new Emotionary{'\n'}is here.
      </Headline>
      <Body tone="muted" style={styles.body}>
        {prompt.message ?? `Update from ${STORE_NAME} for the latest words and improvements.`}
      </Body>
      <View style={styles.actions}>
        <Button
          label="Update"
          onPress={() => {
            close();
            openStore();
          }}
          accessibilityHint={`Opens Emotionary in ${STORE_NAME}`}
        />
        <Button label="Not now" variant="link" onPress={close} />
      </View>
    </Dialog>
  );
}

/** Hard floor: only when app_config sets a minimum above this version. */
export function UpdateRequiredScreen({ message }: { message: string | null }) {
  return (
    <Screen>
      <OrbitBackdrop top="10%" />
      <View style={styles.required}>
        <Eyebrow>Update needed</Eyebrow>
        <Headline size={40} style={styles.title} align="center">
          Time for a{'\n'}fresh version.
        </Headline>
        <Body tone="muted" align="center" style={styles.body}>
          {message ?? `This version of Emotionary is no longer supported. Update from ${STORE_NAME} to keep going. Your words, favorites and streak are saved.`}
        </Body>
        <Button label="Update" onPress={openStore} accessibilityHint={`Opens Emotionary in ${STORE_NAME}`} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.s },
  body: { marginTop: space.m },
  actions: { marginTop: space.l, gap: space.s },
  required: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.l,
    gap: space.s,
  },
});
