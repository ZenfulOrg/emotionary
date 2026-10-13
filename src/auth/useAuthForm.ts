import { Keyboard } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { AuthError, createAccount, resendSignupCode, signIn, signInWithApple, signInWithGoogle, verifySignupCode } from '@/auth/client';
import { lightImpactHaptic, successHaptic } from '@/feedback/haptics';

export type AuthMode = 'create' | 'sign-in';

/**
 * Email + social sign-in state shared by onboarding and the Account screen.
 * `onComplete` fires only after a session has been saved, never while email
 * confirmation is pending.
 */
export function useAuthForm({
  initialMode,
  onComplete,
}: {
  initialMode: AuthMode;
  onComplete: () => void;
}) {
  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    if (resendAt <= Date.now()) return;
    const timer = setInterval(() => {
      update();
      if (Date.now() >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const beginVerification = (address: string, notice: string, cooldown: boolean) => {
    setVerificationEmail(address.trim().toLowerCase());
    setCode('');
    setPassword('');
    setMessage(notice);
    setResendAt(cooldown ? Date.now() + 60_000 : 0);
  };

  const errorMessage = (error: unknown) => {
    if (error instanceof AuthError && error.code === 'otp_expired') {
      return 'That code is invalid or has expired. Request a new code and try again.';
    }
    return error instanceof Error ? error.message : 'Account request failed. Try again.';
  };

  const setMode = (next: AuthMode) => {
    if (inFlight.current) return;
    setModeState(next);
    setVerificationEmail(null);
    setCode('');
    setPassword('');
    setMessage('');
  };

  const submit = async () => {
    if (inFlight.current) return;
    Keyboard.dismiss();
    if (verificationEmail) {
      if (!/^\d{6,10}$/.test(code.replace(/\s/g, ''))) {
        return setMessage('Enter the verification code from your email.');
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMessage('Enter a valid email address.');
      if (!password) return setMessage('Enter your password.');
      if (mode === 'create' && password.length < 8) return setMessage('Use at least 8 characters for your password.');
    }
    if (!verificationEmail && mode === 'create' && !termsAccepted) {
      return setMessage('Agree to the Terms of Use and Privacy Policy to create an account.');
    }

    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (verificationEmail) {
        await verifySignupCode(verificationEmail, code);
        setCode('');
        setMessage('Your email is confirmed. You are signed in.');
        successHaptic();
        onComplete();
      } else if (mode === 'create') {
        const result = await createAccount(email, password);
        if (result.requiresEmailConfirmation) {
          beginVerification(email, 'We sent a verification email. Enter its code below to finish creating your account.', true);
          return;
        }
        setPassword('');
        setMessage('Your account is ready.');
        successHaptic();
        onComplete();
      } else {
        await signIn(email, password);
        setMessage('You are signed in.');
        successHaptic();
        setPassword('');
        onComplete();
      }
    } catch (error) {
      if (error instanceof AuthError && error.code === 'email_not_confirmed' && !verificationEmail) {
        beginVerification(email, 'Your email still needs confirmation. Enter the code from your email, or request a new code.', false);
      } else {
        setMessage(errorMessage(error));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!verificationEmail || inFlight.current || Date.now() < resendAt) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    // Keep a cooldown after errors too, so repeated taps cannot hammer email delivery.
    setResendAt(Date.now() + 60_000);
    try {
      await resendSignupCode(verificationEmail);
      setCode('');
      setMessage('A new verification email is on its way. Use the most recent code.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const changeEmail = () => {
    if (inFlight.current) return;
    setVerificationEmail(null);
    setCode('');
    setMessage('');
  };

  const social = async (provider: 'apple' | 'google') => {
    if (inFlight.current) return;
    Keyboard.dismiss();
    lightImpactHaptic();
    inFlight.current = true;
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
      onComplete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed. Try again.');
    } finally {
      inFlight.current = false;
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
    verificationEmail,
    code,
    setCode,
    resend,
    resendSeconds,
    changeEmail,
    submitLabel: verificationEmail ? 'Verify email' : mode === 'create' ? 'Create account' : 'Sign in',
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
