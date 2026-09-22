import { router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { useAuthForm } from '@/auth/useAuthForm';
import { AuthForm } from '@/components/AuthForm';
import { Body, Headline, Screen, ScreenHeader } from '@/components/brand';
import { layout, space } from '@/theme/tokens';

export default function AccountScreen() {
  const form = useAuthForm({
    initialMode: 'sign-in',
    confirmationMessage: 'Check your email to confirm your account, then return here to sign in.',
    onComplete: ({ confirmed }) => {
      if (confirmed) setTimeout(() => router.back(), 550);
    },
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        left={{ glyph: 'back', label: 'Back', onPress: () => router.back() }}
        eyebrow="Account"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Headline size={44}>{form.mode === 'create' ? 'Make it yours.' : 'Welcome back.'}</Headline>
          <Body tone="muted" style={styles.subtitle}>
            Keep your saved words and your streak connected across devices.
          </Body>
          <AuthForm form={form} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    paddingBottom: 56,
  },
  subtitle: { marginTop: space.s, marginBottom: space.l },
});
