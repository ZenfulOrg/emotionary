import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { fetch } from 'expo/fetch';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';

const SESSION_KEY = 'emotionary.auth.session.v1';
const APPLE_USER_KEY = 'emotionary.auth.apple-user.v1';

/** Must be allow-listed in the Supabase Auth redirect URLs. */
const OAUTH_REDIRECT = 'emotionary://auth-callback';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  email: string;
}

export interface AuthAccount {
  email: string;
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  user?: { email?: string };
  error?: string;
  error_description?: string;
  error_code?: string;
  message?: string;
  msg?: string;
}

export class AuthError extends Error {
  constructor(message: string, public readonly code?: string, public readonly status?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

function assertSyncEnabled() {
  if (!syncEnabled) {
    throw new AuthError('Account access is temporarily unavailable. You can continue without one.');
  }
}

async function authPost(path: string, body: Record<string, unknown>) {
  assertSyncEnabled();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError('Could not connect. Check your internet connection and try again.');
  }

  const payload = (await response.json().catch(() => ({}))) as SupabaseAuthResponse;
  if (!response.ok) {
    throw new AuthError(
      payload.error_description ?? payload.msg ?? payload.message ?? payload.error ?? 'Account request failed. Try again.',
      payload.error_code,
      response.status,
    );
  }

  return payload;
}

async function requestAuth(path: string, email: string, password: string) {
  return authPost(path, { email: email.trim().toLowerCase(), password });
}

async function saveSessionTokens(accessToken: string, refreshToken: string, email: string) {
  if (process.env.EXPO_OS === 'web') return false;
  const session: AuthSession = { accessToken, refreshToken, email };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return true;
}

async function saveSession(payload: SupabaseAuthResponse, fallbackEmail: string) {
  if (!payload.access_token || !payload.refresh_token) return false;
  return saveSessionTokens(
    payload.access_token,
    payload.refresh_token,
    payload.user?.email ?? fallbackEmail.trim().toLowerCase(),
  );
}

async function readSession(): Promise<AuthSession | null> {
  if (process.env.EXPO_OS === 'web') return null;
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Partial<AuthSession>;
    if (!session.accessToken || !session.refreshToken) return null;
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      email: session.email ?? emailFromJwt(session.accessToken) ?? '',
    };
  } catch {
    return null;
  }
}

async function clearSession() {
  if (process.env.EXPO_OS !== 'web') await Promise.all([
    SecureStore.deleteItemAsync(SESSION_KEY), SecureStore.deleteItemAsync(APPLE_USER_KEY),
  ]);
}

async function freshSession(): Promise<AuthSession> {
  const current = await readSession();
  if (!current) throw new AuthError('Sign in again to manage your account.');

  const expiresAt = jwtClaims(current.accessToken)?.exp;
  if (!expiresAt || expiresAt * 1000 > Date.now() + 60_000) return current;

  const payload = await authPost('token?grant_type=refresh_token', {
    refresh_token: current.refreshToken,
  });
  if (!payload.access_token || !payload.refresh_token) {
    throw new AuthError('Your session expired. Sign in again to continue.');
  }
  const email = payload.user?.email ?? current.email;
  await saveSessionTokens(payload.access_token, payload.refresh_token, email);
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    email,
  };
}

export async function createAccount(email: string, password: string) {
  const payload = await requestAuth(
    `signup?redirect_to=${encodeURIComponent(OAUTH_REDIRECT)}`,
    email,
    password,
  );
  const signedIn = await saveSession(payload, email);
  return { requiresEmailConfirmation: !signedIn };
}

export async function signIn(email: string, password: string) {
  const payload = await requestAuth('token?grant_type=password', email, password);
  const signedIn = await saveSession(payload, email);
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
}

/** Confirms an email/password signup with the code from the confirmation email. */
export async function verifySignupCode(email: string, code: string): Promise<AuthAccount> {
  const token = code.replace(/\s/g, '');
  if (!/^\d{6,10}$/.test(token)) throw new AuthError('Enter the verification code from your email.');
  const normalizedEmail = email.trim().toLowerCase();
  const payload = await authPost('verify', { email: normalizedEmail, token, type: 'email' });
  if (!(await saveSession(payload, normalizedEmail))) {
    throw new AuthError('Your session could not be saved securely. Please sign in again.');
  }
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
  return { email: payload.user?.email ?? normalizedEmail };
}

export async function resendSignupCode(email: string): Promise<void> {
  await authPost(`resend?redirect_to=${encodeURIComponent(OAUTH_REDIRECT)}`, {
    email: email.trim().toLowerCase(),
    type: 'signup',
  });
}

/**
 * Native Sign in with Apple → Supabase id_token grant.
 * Resolves null when the person cancels the Apple sheet.
 * expo-apple-authentication is loaded lazily — a static import registers a
 * native view at module scope and breaks web/server rendering.
 */
export async function signInWithApple(): Promise<{ email: string | null } | null> {
  assertSyncEnabled();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AppleAuthentication = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  let credential: Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw new AuthError('Apple sign-in is unavailable right now. Try again.');
  }

  if (!credential.identityToken) {
    throw new AuthError('Apple did not return a sign-in token. Try again.');
  }

  const payload = await authPost('token?grant_type=id_token', {
    provider: 'apple',
    id_token: credential.identityToken,
  });
  const email = payload.user?.email ?? credential.email ?? '';
  const signedIn = await saveSession(payload, email);
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
  await SecureStore.setItemAsync(APPLE_USER_KEY, credential.user);
  return { email: email || null };
}

/**
 * Google sign-in via the Supabase OAuth flow in an in-app browser session.
 * Resolves null when the person closes the browser without finishing.
 */
export async function signInWithGoogle(): Promise<{ email: string | null } | null> {
  assertSyncEnabled();

  const authUrl =
    `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
    `&redirect_to=${encodeURIComponent(OAUTH_REDIRECT)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, OAUTH_REDIRECT);
  if (result.type !== 'success') return null;

  const params = parseFragmentParams(result.url);
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new AuthError(
      params.error_description?.replace(/\+/g, ' ') ?? 'Google sign-in did not complete. Try again.',
    );
  }

  const email = emailFromJwt(accessToken);
  const signedIn = await saveSessionTokens(accessToken, refreshToken, email ?? '');
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
  return { email };
}

/** Legacy email links and OAuth use the implicit flow; new signups use an in-app code. */
export async function completeAuthCallback(url: string): Promise<AuthAccount> {
  assertSyncEnabled();
  if (url.split(/[?#]/)[0] !== OAUTH_REDIRECT) {
    throw new AuthError('This is not an Emotionary confirmation link.');
  }
  const params = parseFragmentParams(url);
  if (params.error || params.error_description) {
    throw new AuthError(params.error_description ?? 'This confirmation link is invalid or expired.');
  }
  if (params.type === 'recovery') {
    throw new AuthError('This is a password-reset link, not an email confirmation link.');
  }
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new AuthError(
      params.error_description?.replace(/\+/g, ' ') ?? 'This confirmation link is invalid or expired.',
    );
  }
  // Never treat unverified token claims in an incoming URL as a signed-in account.
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new AuthError('Could not confirm the link. Check your connection and try again.');
  }
  const user = (await response.json().catch(() => ({}))) as { id?: string; email?: string };
  if (!response.ok || !user.id) throw new AuthError('This confirmation link is invalid or expired.');
  const email = user.email ?? '';
  const saved = await saveSessionTokens(accessToken, refreshToken, email);
  if (!saved) throw new AuthError('Your account was confirmed, but the session could not be saved.');
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
  return { email };
}

export async function getAuthAccount(): Promise<AuthAccount | null> {
  const session = await readSession();
  return session ? { email: session.email || emailFromJwt(session.accessToken) || 'Signed in' } : null;
}

/** Revokes the current session when possible and always removes it from this device. */
export async function signOut() {
  const session = await readSession();
  try {
    if (session) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    }
  } finally {
    await clearSession();
  }
}

/** Permanently deletes the authenticated Supabase user through a server-only function. */
export async function deleteAccount() {
  assertSyncEnabled();
  const session = await freshSession();
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    throw new AuthError('Could not connect. Check your internet connection and try again.');
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new AuthError(payload.error ?? 'Your account could not be deleted. Try again.');
  await clearSession();
}

/** Supabase returns OAuth tokens in the URL fragment (#access_token=…&…). */
function parseFragmentParams(url: string): Record<string, string | undefined> {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : url.split('?')[1] ?? '';
  try {
    const params: Record<string, string> = {};
    for (const pair of fragment.split('&')) {
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const decode = (value: string) => decodeURIComponent(value.replace(/\+/g, ' '));
      params[decode(pair.slice(0, separator))] = decode(pair.slice(separator + 1));
    }
    return params;
  } catch {
    throw new AuthError('This confirmation link is invalid or expired.');
  }
}

function emailFromJwt(token: string): string | null {
  return jwtClaims(token)?.email ?? null;
}

function jwtClaims(token: string): { email?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as { email?: string; exp?: number };
  } catch {
    return null;
  }
}

/** Apple TN3194: respond to manually revoked Apple access when no Apple refresh token is retained. */
export async function checkAppleCredential(): Promise<boolean> {
  if (process.env.EXPO_OS !== 'ios') return false;
  const user = await SecureStore.getItemAsync(APPLE_USER_KEY);
  if (!user) return false;
  try {
    const Apple = await import('expo-apple-authentication');
    const state = await Apple.getCredentialStateAsync(user);
    if (state === Apple.AppleAuthenticationCredentialState.REVOKED ||
        state === Apple.AppleAuthenticationCredentialState.NOT_FOUND) {
      await signOut().catch(() => {}); // signOut always clears the local credentials.
      return true;
    }
  } catch { /* A temporary Apple/network failure does not invalidate the account. */ }
  return false;
}
