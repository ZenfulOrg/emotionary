import { Keyboard } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { syncMarketingConsent } from '@/auth/marketing';
import { linkPurchasesToAccount } from '@/purchases/account';
import { useUserStore } from '@/store/userStore';
import {
  AuthError,
  createAccount,
  requestPasswordReset,
  resendSignupCode,
  resetPasswordWithCode,
  signIn,
  signInWithApple,
  signInWithGoogle,
  verifySignupCode,
} from '@/auth/client';
import { lightImpactHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';

export type AuthMode = 'create' | 'sign-in';
/** Forgot password: ask for the email, then the emailed code and a new password. */
export type ResetStage = 'request' | 'code';

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
  // New accounts start opted in to marketing email unless they already chose
  // (disclosed in the Terms and Privacy Policy; Settings and every email can
  // turn it off). Signing in ties store purchases to the account and lifts
  // the signed-out gate.
  const complete = () => {
    const store = useUserStore.getState();
    if (mode === 'create' && store.marketingOptIn === null) store.setMarketingOptIn(true);
    store.setSignedOut(false);
    // Today greets a fresh sign-in with its reveal and haptic.
    store.replayReveal();
    void syncMarketingConsent();
    void linkPurchasesToAccount();
    onComplete();
  };
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resetStage, setResetStage] = useState<ResetStage | null>(null);

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
    setResetStage(null);
    setVerificationEmail(null);
    setCode('');
    setPassword('');
    setMessage('');
  };

  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  /** Forgot password: the reset steps share the form's one submit button. */
  const submitReset = async () => {
    if (resetStage === 'request') {
      if (!validEmail()) {
        warningHaptic();
        return setMessage('');
      }
    } else {
      if (!/^\d{6,10}$/.test(code.replace(/\s/g, ''))) return setMessage('Enter the code from your email.');
      if (password.length < 8) return setMessage('Use at least 8 characters for your new password.');
    }
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (resetStage === 'request') {
        await requestPasswordReset(email);
        setCode('');
        setPassword('');
        setResetStage('code');
        setResendAt(Date.now() + 60_000);
        setMessage(`If there's an account for ${email.trim().toLowerCase()}, we sent it a 6-digit code.`);
      } else {
        await resetPasswordWithCode(email, code, password);
        setCode('');
        setPassword('');
        setResetStage(null);
        setMessage('Your password is updated. You are signed in.');
        successHaptic();
        complete();
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const submit = async () => {
    if (inFlight.current) return;
    Keyboard.dismiss();
    if (resetStage) return submitReset();
    if (verificationEmail) {
      if (!/^\d{6,10}$/.test(code.replace(/\s/g, ''))) {
        return setMessage('Enter the verification code from your email.');
      }
    } else {
      // No message for a missing or malformed email: a nudge, and nothing is sent.
      if (!validEmail()) {
        warningHaptic();
        return setMessage('');
      }
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
        complete();
      } else if (mode === 'create') {
        const result = await createAccount(email, password);
        if (result.requiresEmailConfirmation) {
          beginVerification(email, 'We sent a verification email. Enter its code below to finish creating your account.', true);
          return;
        }
        setPassword('');
        setMessage('Your account is ready.');
        successHaptic();
        complete();
      } else {
        await signIn(email, password);
        setMessage('You are signed in.');
        successHaptic();
        setPassword('');
        complete();
      }
    } catch (error) {
      if (error instanceof AuthError && ['signup_not_created', 'user_already_exists'].includes(error.code ?? '') && !verificationEmail) {
        setModeState('sign-in');
        setPassword('');
        setMessage('No new verification code was sent. If you already have an account, sign in with your password or the Apple or Google option you used before.');
      } else if (error instanceof AuthError && error.code === 'email_not_confirmed' && !verificationEmail) {
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
    if ((!verificationEmail && resetStage !== 'code') || inFlight.current || Date.now() < resendAt) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    // Keep a cooldown after errors too, so repeated taps cannot hammer email delivery.
    setResendAt(Date.now() + 60_000);
    try {
      if (resetStage === 'code') await requestPasswordReset(email);
      else if (verificationEmail) await resendSignupCode(verificationEmail);
      setCode('');
      setMessage('A new code is on its way. Use the most recent one.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  /** "Forgot password?": keeps the typed email and starts the reset. */
  const startReset = () => {
    if (inFlight.current) return;
    setModeState('sign-in');
    setVerificationEmail(null);
    setResetStage('request');
    setCode('');
    setPassword('');
    setMessage('');
  };

  /** Back to signing in from either reset step. */
  const cancelReset = () => {
    if (inFlight.current) return;
    setResetStage(null);
    setCode('');
    setPassword('');
    setMessage('');
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
      complete();
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
    resetStage,
    startReset,
    cancelReset,
    submitLabel:
      resetStage === 'request'
        ? 'Send code'
        : resetStage === 'code'
          ? 'Set new password'
          : verificationEmail
            ? 'Verify email'
            : mode === 'create'
              ? 'Create account'
              : 'Sign in',
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
