import { Keyboard } from 'react-native';
import { useState } from 'react';

import { createAccount, signIn, signInWithApple, signInWithGoogle } from '@/auth/client';
import { lightImpactHaptic, successHaptic } from '@/feedback/haptics';

export type AuthMode = 'create' | 'sign-in';

/**
 * Email + social sign-in state shared by onboarding and the Account screen.
 * `onComplete` fires once the person is signed in, or once a new account is
 * waiting on email confirmation (`confirmed: false`).
 */
export function useAuthForm({
  initialMode,
  confirmationMessage,
  onComplete,
}: {
  initialMode: AuthMode;
  confirmationMessage: string;
  onComplete: (result: { confirmed: boolean }) => void;
}) {
  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const setMode = (next: AuthMode) => {
    setModeState(next);
    setMessage('');
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
        setMessage(result.requiresEmailConfirmation ? confirmationMessage : 'Your account is ready.');
        successHaptic();
        onComplete({ confirmed: !result.requiresEmailConfirmation });
      } else {
        await signIn(email, password);
        setMessage('You are signed in.');
        successHaptic();
        onComplete({ confirmed: true });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Account request failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: 'apple' | 'google') => {
    if (busy) return;
    Keyboard.dismiss();
    lightImpactHaptic();
    setBusy(true);
    setMessage('');
    try {
      const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (!result) {
        setMessage(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in was cancelled.`);
        return;
      }
      setMessage(result.email ? `You are signed in as ${result.email}.` : 'You are signed in.');
      successHaptic();
      onComplete({ confirmed: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    termsAccepted,
    setTermsAccepted,
    message,
    busy,
    submit,
    social,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
