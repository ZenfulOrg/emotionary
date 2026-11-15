import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { useAuthForm } from '@/auth/useAuthForm';
import { AuthForm } from '@/components/AuthForm';
import { Headline, Screen, Wordmark } from '@/components/brand';
import { useUserStore } from '@/store/userStore';
import { layout, space } from '@/theme/tokens';

/**
 * Where the app goes after Sign out: nothing else is reachable until an
 * account signs in (or a new one is created). No back button on purpose.
 */
export default function SignInScreen() {
  const signedOut = useUserStore((s) => s.signedOut);
  const form = useAuthForm({
    initialMode: 'sign-in',
    onComplete: () => {
      setTimeout(() => router.replace('/'), 550);
    },
  });

  // Opened while signed in (e.g. a stale link): just go home.
  if (!signedOut && !form.busy && form.message.length === 0) return <Redirect href="/" />;

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Wordmark />
          <Headline size={44} style={styles.title}>
            {form.resetStage
              ? 'A fresh start.'
              : form.verificationEmail
                ? 'Confirm your email.'
                : form.mode === 'create'
                  ? 'Make it yours.'
                  : 'Welcome back.'}
          </Headline>
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
    paddingTop: space.xl,
    paddingBottom: 56,
  },
  title: { marginTop: space.l, marginBottom: space.l },
});
