import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { fetch } from 'expo/fetch';

import { createAccount, signIn, signInWithApple, signInWithGoogle } from '@/auth/client';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn() }));
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
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;

function response(body: object, ok = true): Awaited<ReturnType<typeof fetch>> {
  return { ok, json: async () => body } as unknown as Awaited<ReturnType<typeof fetch>>;
}

describe('auth client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates an account and securely saves an immediate session', async () => {
    mockFetch.mockResolvedValue(
      response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'me@example.com' } }),
    );

    await expect(createAccount('ME@example.com', 'password123')).resolves.toEqual({
      requiresEmailConfirmation: false,
    });
    expect(mockSetItem).toHaveBeenCalledWith(
      'emotionary.auth.session.v1',
      JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', email: 'me@example.com' }),
    );
  });

  test('allows account creation to continue when email confirmation is required', async () => {
    mockFetch.mockResolvedValue(response({ user: { email: 'me@example.com' } }));

    await expect(createAccount('me@example.com', 'password123')).resolves.toEqual({
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
});
