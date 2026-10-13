import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AuthError, createAccount, resendSignupCode, signIn, verifySignupCode } from '@/auth/client';
import { useAuthForm, type AuthFormState, type AuthMode } from '@/auth/useAuthForm';

jest.mock('@/auth/client', () => ({
  ...jest.requireActual('@/auth/client'),
  createAccount: jest.fn(), resendSignupCode: jest.fn(), signIn: jest.fn(), verifySignupCode: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({}));
jest.mock('expo-web-browser', () => ({}));
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('@/feedback/haptics', () => ({ lightImpactHaptic: jest.fn(), successHaptic: jest.fn() }));

describe('email confirmation flow', () => {
  let form: AuthFormState;
  let renderer: ReactTestRenderer;
  const onComplete = jest.fn();
  function Harness({ mode }: { mode: AuthMode }) {
    form = useAuthForm({ initialMode: mode, onComplete });
    return null;
  }
  const start = async (mode: AuthMode = 'create') => {
    await act(async () => { renderer = create(<Harness mode={mode} />); });
    act(() => { form.setEmail(' NEW@example.com '); form.setPassword('password123'); });
  };
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    jest.mocked(createAccount).mockResolvedValue({ requiresEmailConfirmation: true });
    jest.mocked(verifySignupCode).mockResolvedValue({ email: 'new@example.com' });
    jest.mocked(resendSignupCode).mockResolvedValue();
  });
  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    jest.useRealTimers();
  });

  it('stays on confirmation until a valid code establishes a session', async () => {
    await start();
    await act(async () => { await form.submit(); });
    expect(onComplete).not.toHaveBeenCalled();
    expect(form.verificationEmail).toBe('new@example.com');
    expect(form.submitLabel).toBe('Verify email');
    expect(form.password).toBe('');
    act(() => form.setCode('12345678'));
    await act(async () => { await form.submit(); });
    expect(verifySignupCode).toHaveBeenCalledWith('new@example.com', '12345678');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the user on confirmation after an expired code', async () => {
    await start();
    await act(async () => { await form.submit(); });
    jest.mocked(verifySignupCode).mockRejectedValue(new AuthError('expired', 'otp_expired'));
    act(() => form.setCode('123456'));
    await act(async () => { await form.submit(); });
    expect(form.message).toContain('Request a new code');
    expect(form.verificationEmail).toBe('new@example.com');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('throttles resend and uses the confirmation endpoint without repeating signup', async () => {
    await start();
    await act(async () => { await form.submit(); await form.resend(); });
    expect(resendSignupCode).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(60_000));
    expect(form.resendSeconds).toBe(0);
    await act(async () => { await form.resend(); });
    expect(resendSignupCode).toHaveBeenCalledWith('new@example.com');
    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(form.resendSeconds).toBe(60);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('recovers unconfirmed password sign-in into code verification', async () => {
    await start('sign-in');
    jest.mocked(signIn).mockRejectedValue(new AuthError('Email not confirmed', 'email_not_confirmed'));
    await act(async () => { await form.submit(); });
    expect(form.verificationEmail).toBe('new@example.com');
    expect(form.resendSeconds).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
    expect(createAccount).not.toHaveBeenCalled();
    await act(async () => { await form.resend(); });
    expect(resendSignupCode).toHaveBeenCalledWith('new@example.com');
  });

  it('clears the pending code and address when returning to password sign-in', async () => {
    await start();
    await act(async () => { await form.submit(); });
    act(() => { form.setCode('123456'); form.setMode('sign-in'); });
    expect(form.verificationEmail).toBeNull();
    expect(form.code).toBe('');
    expect(form.submitLabel).toBe('Sign in');
  });

  it('does not send duplicate signup requests on a double tap', async () => {
    await start();
    let finish!: (result: { requiresEmailConfirmation: boolean }) => void;
    jest.mocked(createAccount).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await act(async () => {
      const first = form.submit();
      const second = form.submit();
      finish({ requiresEmailConfirmation: true });
      await Promise.all([first, second]);
    });
    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
