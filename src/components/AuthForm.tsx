import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AuthFormState } from '@/auth/useAuthForm';
import { Body, Button, Chip, Eyebrow, IconButton, Rule, TextField } from '@/components/brand';
import { TermsCheckbox } from '@/components/terms-checkbox';
import { useGround } from '@/theme/ground';
import { font, space, type } from '@/theme/tokens';

/** Social buttons, the create / sign-in switch, fields, terms, and a live status line. */
export function AuthForm({ form, showSubmit = true }: { form: AuthFormState; showSubmit?: boolean }) {
  const ground = useGround();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const creating = form.mode === 'create';

  if (form.verificationEmail) {
    return (
      <View style={styles.wrap}>
        <Eyebrow>Check your email</Eyebrow>
        <Body tone="muted" style={styles.message}>
          Enter the code sent to {form.verificationEmail}.
        </Body>
        <View style={styles.fields}>
          <TextField
            value={form.code}
            onChangeText={(value) => form.setCode(value.replace(/\s/g, ''))}
            placeholder="Verification code"
            accessibilityLabel="Email verification code"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={10}
            editable={!form.busy}
            onSubmitEditing={() => void form.submit()}
          />
        </View>
        {form.message.length > 0 && (
          <Body tone="muted" size={type.small} style={styles.message} accessibilityLiveRegion="polite">
            {form.message}
          </Body>
        )}
        {showSubmit && <Button label={form.submitLabel} onPress={() => void form.submit()} busy={form.busy} style={styles.submit} />}
        <Button
          label={form.resendSeconds > 0 ? `Resend code in ${form.resendSeconds}s` : 'Resend code'}
          variant="link"
          disabled={form.busy || form.resendSeconds > 0}
          onPress={() => void form.resend()}
        />
        <Button label="Use a different email" variant="link" disabled={form.busy} onPress={form.changeEmail} />
        <Button label="Already confirmed? Sign in" variant="link" disabled={form.busy} onPress={() => form.setMode('sign-in')} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.socials}>
        {process.env.EXPO_OS === 'ios' && <AppleButton onPress={() => void form.social('apple')} />}
        <Button
          label="Continue with Google"
          variant="outline"
          onPress={() => void form.social('google')}
          disabled={form.busy}
        />
      </View>

      <View style={styles.orRow} accessibilityElementsHidden>
        <View style={styles.orLine}>
          <Rule animate={false} />
        </View>
        <Eyebrow tone="muted">or</Eyebrow>
        <View style={styles.orLine}>
          <Rule animate={false} />
        </View>
      </View>

      <View style={styles.modes} accessibilityRole="radiogroup">
        {(['create', 'sign-in'] as const).map((item) => (
          <View key={item} style={styles.mode}>
            <Chip
              label={item === 'create' ? 'Create account' : 'Sign in'}
              role="radio"
              selected={form.mode === item}
              onPress={() => form.setMode(item)}
            />
          </View>
        ))}
      </View>

      <View style={styles.fields}>
        <TextField
          value={form.email}
          onChangeText={form.setEmail}
          placeholder="Email address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!form.busy}
          accessibilityLabel="Email address"
        />
        <TextField
          value={form.password}
          onChangeText={form.setPassword}
          placeholder={creating ? 'Password (8+ characters)' : 'Password'}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={creating ? 'new-password' : 'current-password'}
          textContentType={creating ? 'newPassword' : 'password'}
          secureTextEntry={!passwordVisible}
          returnKeyType="done"
          onSubmitEditing={() => void form.submit()}
          editable={!form.busy}
          accessibilityLabel="Password"
          trailing={
            <IconButton
              glyph={passwordVisible ? 'eyeOff' : 'eye'}
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              onPress={() => setPasswordVisible((visible) => !visible)}
              color={ground.textMuted}
              size={20}
            />
          }
        />
      </View>

      {creating && (
        <View style={styles.termsRow}>
          <TermsCheckbox
            value={form.termsAccepted}
            onValueChange={form.setTermsAccepted}
            testID="terms-checkbox"
          />
          <Body size={type.small} tone="muted" style={styles.terms}>
            By continuing you agree to Emotionary&apos;s{' '}
            <Text
              style={[styles.link, { color: ground.text }]}
              onPress={() => router.push('/legal/terms' as Href)}
              accessibilityRole="link"
            >
              Terms of Use
            </Text>{' '}
            and{' '}
            <Text
              style={[styles.link, { color: ground.text }]}
              onPress={() => router.push('/legal/privacy' as Href)}
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
            .
          </Body>
        </View>
      )}

      {form.message.length > 0 && (
        <Body size={type.small} tone="muted" style={styles.message} accessibilityLiveRegion="polite">
          {form.message}
        </Body>
      )}

      {showSubmit && (
        <Button
          label={form.submitLabel}
          onPress={() => void form.submit()}
          busy={form.busy}
          style={styles.submit}
        />
      )}
    </View>
  );
}

/** Apple's own button, as Apple asks — squared to sit with the rest of the system. */
function AppleButton({ onPress }: { onPress: () => void }) {
  // Lazy require: the native view only exists on iOS.
  const AppleAuthentication =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={0}
      style={styles.apple}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  socials: { gap: space.s },
  apple: { width: '100%', height: 52 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginVertical: space.l },
  orLine: { flex: 1 },
  modes: { flexDirection: 'row', gap: space.s },
  mode: { flex: 1 },
  fields: { gap: space.s, marginTop: space.m },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m, marginTop: space.m },
  terms: { flex: 1, lineHeight: 22 },
  link: { fontFamily: font.text, textDecorationLine: 'underline' },
  message: { marginTop: space.m, textAlign: 'center' },
  submit: { marginTop: space.l },
});
