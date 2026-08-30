import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createAccount, signIn, signInWithApple, signInWithGoogle } from '@/auth/client';
import { SystemIcon } from '@/components/system-icon';
import { TermsCheckbox } from '@/components/terms-checkbox';
import { selectionHaptic, successHaptic } from '@/feedback/haptics';
import { color, font, space, type } from '@/theme/tokens';

type Mode = 'create' | 'sign-in';

export default function AccountScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const finishSignedIn = () => {
    successHaptic();
    setMessage('You are signed in.');
    setTimeout(() => router.back(), 550);
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (!email.trim().includes('@')) return setMessage('Enter a valid email address.');
    if (password.length < 8) return setMessage('Use at least 8 characters for your password.');
    if (mode === 'create' && !termsAccepted) {
      return setMessage('Agree to the Terms of Use and Privacy Policy to create an account.');
    }

    setBusy(true);
    setMessage('');
    try {
      if (mode === 'create') {
        const result = await createAccount(email, password);
        if (result.requiresEmailConfirmation) {
          successHaptic();
          setMessage('Check your email to confirm your account, then return here to sign in.');
        } else {
          finishSignedIn();
        }
      } else {
        await signIn(email, password);
        finishSignedIn();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Account request failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: 'apple' | 'google') => {
    setBusy(true);
    setMessage('');
    try {
      const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (!result) setMessage(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in was cancelled.`);
      else finishSignedIn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === 'create' ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={styles.subtitle}>Keep your Emotionary account secure and connected.</Text>

        <View style={styles.socials}>
          {process.env.EXPO_OS === 'ios' && (
            <Pressable onPress={() => void social('apple')} disabled={busy} style={[styles.social, styles.apple]}>
              <SystemIcon name="apple.logo" fallback="" size={17} color="#FFFFFF" />
              <Text style={[styles.socialText, styles.appleText]}>Continue with Apple</Text>
            </Pressable>
          )}
          <Pressable onPress={() => void social('google')} disabled={busy} style={[styles.social, styles.google]}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </Pressable>
        </View>

        <View style={styles.modeRow}>
          {(['create', 'sign-in'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                selectionHaptic();
                setMode(item);
                setMessage('');
              }}
              style={[styles.mode, mode === item && styles.modeActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === item }}
            >
              <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                {item === 'create' ? 'CREATE' : 'SIGN IN'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={color.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
          />
          <View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'create' ? 'Password (8+ characters)' : 'Password'}
              placeholderTextColor={color.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              textContentType={mode === 'create' ? 'newPassword' : 'password'}
              secureTextEntry={!passwordVisible}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              style={[styles.input, styles.passwordInput]}
            />
            <Pressable
              onPress={() => setPasswordVisible((current) => !current)}
              style={styles.eye}
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            >
              <SystemIcon name={passwordVisible ? 'eye.slash' : 'eye'} fallback="○" size={20} color={color.inkMuted} />
            </Pressable>
          </View>
        </View>

        {mode === 'create' && (
          <View style={styles.termsRow}>
            <TermsCheckbox value={termsAccepted} onValueChange={setTermsAccepted} />
            <Text style={styles.terms}>
              By continuing you agree to Emotionary&apos;s{' '}
              <Text style={styles.link} onPress={() => router.push('/legal/terms' as Href)}>Terms of Use</Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={() => router.push('/legal/privacy' as Href)}>Privacy Policy</Text>.
            </Text>
          </View>
        )}

        {message.length > 0 && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
        <Pressable onPress={() => void submit()} disabled={busy} style={[styles.submit, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color={color.paper} /> : (
            <Text style={styles.submitText}>{mode === 'create' ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7EFE4' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.m },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: font.display, fontSize: 26, color: color.ink },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: space.l, paddingBottom: 56, alignItems: 'center' },
  title: { fontFamily: font.display, fontSize: 36, color: color.ink, textAlign: 'center', marginTop: space.m },
  subtitle: { fontFamily: font.serif, fontSize: type.small, lineHeight: 22, color: color.inkMuted, textAlign: 'center', marginTop: space.s },
  socials: { width: '100%', gap: space.s, marginTop: space.l },
  social: { minHeight: 50, borderRadius: 14, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  apple: { backgroundColor: '#000000' },
  appleText: { color: '#FFFFFF' },
  google: { backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  googleG: { fontFamily: font.serifSemiBold, fontSize: type.body, color: '#3F73B3' },
  socialText: { fontFamily: font.serifMedium, fontSize: type.small, color: color.ink },
  modeRow: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)', marginTop: space.l },
  mode: { minWidth: 112, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  modeActive: { backgroundColor: color.ink },
  modeText: { fontFamily: font.serifMedium, fontSize: type.badge, letterSpacing: 1, color: color.inkMuted },
  modeTextActive: { color: color.paper },
  form: { width: '100%', gap: space.s, marginTop: space.m },
  input: { minHeight: 52, borderRadius: 14, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline, backgroundColor: 'rgba(255,255,255,0.78)', paddingHorizontal: space.m, fontFamily: font.serif, fontSize: type.small, color: color.ink },
  passwordInput: { paddingRight: 54 },
  eye: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  termsRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: space.s, marginTop: space.s },
  terms: { flex: 1, fontFamily: font.serif, fontSize: type.caption, lineHeight: 18, color: color.inkMuted },
  link: { color: color.ink, textDecorationLine: 'underline' },
  message: { fontFamily: font.serif, fontSize: type.caption, lineHeight: 19, color: color.inkMuted, textAlign: 'center', marginTop: space.m },
  submit: { width: '100%', minHeight: 52, borderRadius: 14, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center', marginTop: space.l },
  submitText: { fontFamily: font.serifMedium, fontSize: type.small, letterSpacing: 1.2, color: color.paper },
  disabled: { opacity: 0.55 },
});
