import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { fetch } from 'expo/fetch';

import {
  completeAuthCallback,
  createAccount,
  deleteAccount,
  getAuthAccount,
  signIn,
  signInWithApple,
  signInWithGoogle,
  signOut,
  resendSignupCode,
  refreshComplimentaryAccess,
  verifySignupCode,
} from '@/auth/client';

import { useUserStore } from '@/store/userStore';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));
jest.mock('@/config', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  syncEnabled: true,
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockSetItem = SecureStore.setItemAsync as jest.MockedFunction<
  typeof SecureStore.setItemAsync
>;
const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;

function response(body: object, ok = true): Awaited<ReturnType<typeof fetch>> {
  return { ok, status: ok ? 200 : 400, json: async () => body } as unknown as Awaited<ReturnType<typeof fetch>>;
}

describe('auth client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.setState({ accessLevel: 'free', storeAccess: false, complimentaryAccess: false });
    mockGetItem.mockResolvedValue(null);
  });

  test('creates an account and securely saves an immediate session', async () => {
    mockFetch.mockResolvedValue(
      response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'me@example.com' } }),
    );

    await expect(createAccount('ME@example.com', 'password123')).resolves.toEqual({
      requiresEmailConfirmation: false,
    });
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      'https://example.supabase.co/auth/v1/signup?redirect_to=emotionary%3A%2F%2Fauth-callback',
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      'emotionary.auth.session.v1',
      JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', email: 'me@example.com' }),
    );
  });

  test('reports pending email confirmation without creating a local session', async () => {
    mockFetch.mockResolvedValue(response({ user: { email: 'me@example.com' } }));

    await expect(createAccount('me@example.com', 'password123')).resolves.toEqual({
      requiresEmailConfirmation: true,
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test.each([
    { identities: [] },
    { user: { email: 'me@example.com', identities: [] } },
  ])('does not promise an email for an obfuscated repeated signup: %j', async (payload) => {
    mockFetch.mockResolvedValue(response(payload));
    await expect(createAccount('me@example.com', 'password123')).rejects.toMatchObject({
      code: 'signup_not_created',
    });
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('accepts a new signup with a root-level email identity', async () => {
    mockFetch.mockResolvedValue(response({ identities: [{ provider: 'email' }] }));
    await expect(createAccount('new@example.com', 'password123')).resolves.toEqual({
      requiresEmailConfirmation: true,
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('signs in through the password endpoint and reports API errors', async () => {
    mockFetch.mockResolvedValueOnce(
      response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'me@example.com' } }),
    );
    await expect(signIn('me@example.com', 'password123')).resolves.toBeUndefined();
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      'https://example.supabase.co/auth/v1/token?grant_type=password',
    );

    mockFetch.mockResolvedValueOnce(response({ msg: 'Invalid login credentials' }, false));
    await expect(signIn('me@example.com', 'wrong-password')).rejects.toThrow(
      'Invalid login credentials',
    );
  });

  test('exchanges an Apple identity token and saves the Supabase session', async () => {
    const AppleAuthentication = jest.requireMock('expo-apple-authentication') as typeof import('expo-apple-authentication');
    const mockAppleSignIn = AppleAuthentication.signInAsync as jest.MockedFunction<
      typeof AppleAuthentication.signInAsync
    >;
    mockAppleSignIn.mockResolvedValue({
      identityToken: 'apple-id-token',
      email: 'apple@example.com',
    } as Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>);
    mockFetch.mockResolvedValue(
      response({
        access_token: 'apple-access',
        refresh_token: 'apple-refresh',
        user: { email: 'apple@example.com' },
      }),
    );

    await expect(signInWithApple()).resolves.toEqual({ email: 'apple@example.com' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/token?grant_type=id_token',
      expect.objectContaining({
        body: JSON.stringify({ provider: 'apple', id_token: 'apple-id-token' }),
      }),
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      'emotionary.auth.session.v1',
      JSON.stringify({
        accessToken: 'apple-access',
        refreshToken: 'apple-refresh',
        email: 'apple@example.com',
      }),
    );
  });

  test('completes Google OAuth from the native callback fragment', async () => {
    const jwtPayload = 'eyJlbWFpbCI6Imdvb2dsZUBleGFtcGxlLmNvbSJ9';
    const accessToken = `header.${jwtPayload}.signature`;
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url:
        `emotionary://auth-callback#access_token=${accessToken}` +
        '&refresh_token=google-refresh',
    });

    await expect(signInWithGoogle()).resolves.toEqual({ email: 'google@example.com' });
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/authorize?provider=google' +
        '&redirect_to=emotionary%3A%2F%2Fauth-callback',
      'emotionary://auth-callback',
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      'emotionary.auth.session.v1',
      JSON.stringify({
        accessToken,
        refreshToken: 'google-refresh',
        email: 'google@example.com',
      }),
    );
  });

  test('completes an email confirmation deep link and exposes the signed-in account', async () => {
    const jwtPayload = 'eyJlbWFpbCI6ImNvbmZpcm1lZEBleGFtcGxlLmNvbSJ9';
    const accessToken = `header.${jwtPayload}.signature`;
    mockFetch.mockResolvedValue(response({ id: 'confirmed-user', email: 'confirmed@example.com' }));

    await expect(
      completeAuthCallback(
        `emotionary://auth-callback#access_token=${accessToken}&refresh_token=confirmed-refresh`,
      ),
    ).resolves.toEqual({ email: 'confirmed@example.com' });

    mockGetItem.mockResolvedValue(
      JSON.stringify({
        accessToken,
        refreshToken: 'confirmed-refresh',
        email: 'confirmed@example.com',
      }),
    );
    await expect(getAuthAccount()).resolves.toEqual({ email: 'confirmed@example.com' });
  });

  test.each([
    ['123 456', '123456'],
    ['1234 5678', '12345678'],
  ])('verifies signup code %s and saves the server-issued session', async (enteredCode, token) => {
    mockFetch.mockResolvedValue(response({
      access_token: 'verified-access', refresh_token: 'verified-refresh',
      user: { email: 'new@example.com' },
    }));
    await expect(verifySignupCode(' NEW@example.com ', enteredCode)).resolves.toEqual({ email: 'new@example.com' });
    expect(mockFetch).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/verify', expect.objectContaining({
      body: JSON.stringify({ email: 'new@example.com', token, type: 'email' }),
    }));
    expect(mockSetItem).toHaveBeenCalledWith('emotionary.auth.session.v1', JSON.stringify({
      accessToken: 'verified-access', refreshToken: 'verified-refresh', email: 'new@example.com',
    }));
  });

  test('does not save a session for an invalid code or an incomplete verification response', async () => {
    await expect(verifySignupCode('new@example.com', 'abc')).rejects.toThrow('verification code');
    expect(mockFetch).not.toHaveBeenCalled();
    mockFetch.mockResolvedValueOnce(response({ error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, false));
    await expect(verifySignupCode('new@example.com', '123456')).rejects.toMatchObject({ code: 'otp_expired', status: 400 });
    mockFetch.mockResolvedValueOnce(response({ user: { email: 'new@example.com' } }));
    await expect(verifySignupCode('new@example.com', '123456')).rejects.toThrow('session');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('resends the signup confirmation without creating an account or requesting a magic login', async () => {
    mockFetch.mockResolvedValue(response({}));
    await resendSignupCode(' NEW@example.com ');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/resend?redirect_to=emotionary%3A%2F%2Fauth-callback',
      expect.objectContaining({ body: JSON.stringify({ email: 'new@example.com', type: 'signup' }) }),
    );
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('rejects expired, foreign and unsupported links without accepting tokens', async () => {
    await expect(completeAuthCallback('emotionary://auth-callback#error=access_denied&error_description=Link+expired')).rejects.toThrow('Link expired');
    await expect(completeAuthCallback('https://other.example/auth-callback#access_token=a&refresh_token=b')).rejects.toThrow('not an Emotionary');
    await expect(completeAuthCallback('emotionary://auth-callback?code=pkce-code')).rejects.toThrow('invalid or expired');
    await expect(completeAuthCallback('emotionary://auth-callback#access_token=a&refresh_token=b&type=recovery')).rejects.toThrow('password-reset');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('rejects callback tokens that Supabase does not validate', async () => {
    mockFetch.mockResolvedValue(response({ msg: 'invalid JWT' }, false));
    await expect(completeAuthCallback('emotionary://auth-callback#access_token=forged&refresh_token=fake')).rejects.toThrow('invalid or expired');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('signs out remotely and always clears the local session', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', email: 'me@example.com' }),
    );
    mockFetch.mockResolvedValue(response({}));

    await expect(signOut()).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/logout',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockDeleteItem).toHaveBeenCalledWith('emotionary.auth.session.v1');
  });

  test('deletes an authenticated account through the server function and clears the session', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', email: 'me@example.com' }),
    );
    mockFetch.mockResolvedValue(response({ deleted: true }));

    await expect(deleteAccount()).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/delete-account',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer access' }),
      }),
    );
    expect(mockDeleteItem).toHaveBeenCalledWith('emotionary.auth.session.v1');
  });
});


describe('complimentary account access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.setState({ accessLevel: 'free', storeAccess: false, complimentaryAccess: false });
    mockGetItem.mockResolvedValue(JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', email: 'review@example.com' }));
  });

  test('only server-managed boolean grants unlock the dictionary', async () => {
    mockFetch.mockResolvedValue(response({ id: 'review', user_metadata: { emotionary_full_access: true } }));
    await refreshComplimentaryAccess();
    expect(useUserStore.getState().accessLevel).toBe('free');
    mockFetch.mockResolvedValue(response({ id: 'review', app_metadata: { emotionary_full_access: 'true' } }));
    await refreshComplimentaryAccess();
    expect(useUserStore.getState().accessLevel).toBe('free');
    mockFetch.mockResolvedValue(response({ id: 'review', app_metadata: { emotionary_full_access: true } }));
    await refreshComplimentaryAccess();
    expect(useUserStore.getState().accessLevel).toBe('full');
    useUserStore.getState().setStoreAccess(false);
    expect(useUserStore.getState().accessLevel).toBe('full');
  });

  test('failed verification revokes the grant without revoking a store purchase', async () => {
    useUserStore.getState().setComplimentaryAccess(true);
    mockFetch.mockResolvedValue(response({ id: 'review', app_metadata: { emotionary_full_access: true } }, false));
    await refreshComplimentaryAccess();
    expect(useUserStore.getState().accessLevel).toBe('free');
    useUserStore.getState().setStoreAccess(true);
    mockFetch.mockRejectedValue(new Error('offline'));
    await refreshComplimentaryAccess();
    expect(useUserStore.getState().accessLevel).toBe('full');
  });

  test('sign out prevents a pending response from restoring account access', async () => {
    let finish!: (value: Awaited<ReturnType<typeof fetch>>) => void;
    mockFetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = refreshComplimentaryAccess();
    // Let the asynchronous secure-session reads finish.
    for (let i = 0; i < 10 && !finish; i++) await Promise.resolve();
    expect(finish).toBeDefined();
    mockFetch.mockResolvedValue(response({}));
    await signOut();
    finish(response({ id: 'review', app_metadata: { emotionary_full_access: true } }));
    await pending;
    expect(useUserStore.getState().accessLevel).toBe('free');
  });

  test('sign in grants access immediately from the authenticated response', async () => {
    mockFetch.mockResolvedValue(response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'review@example.com', app_metadata: { emotionary_full_access: true } } }));
    await signIn('review@example.com', 'test-only');
    expect(useUserStore.getState().accessLevel).toBe('full');
    mockFetch.mockResolvedValue(response({ access_token: 'other', refresh_token: 'other-refresh', user: { email: 'other@example.com' } }));
    await signIn('other@example.com', 'test-only');
    expect(useUserStore.getState().accessLevel).toBe('free');
  });
});
