import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { fetch } from 'expo/fetch';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';

const SESSION_KEY = 'emotionary.auth.session.v1';

/** Must be allow-listed in the Supabase Auth redirect URLs. */
const OAUTH_REDIRECT = 'emotionary://auth-callback';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  email: string;
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  user?: { email?: string };
  error?: string;
  error_description?: string;
  msg?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
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
      payload.error_description ?? payload.msg ?? payload.error ?? 'Account request failed. Try again.',
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

export async function createAccount(email: string, password: string) {
  const payload = await requestAuth('signup', email, password);
  const signedIn = await saveSession(payload, email);
  return { requiresEmailConfirmation: !signedIn };
}

export async function signIn(email: string, password: string) {
  const payload = await requestAuth('token?grant_type=password', email, password);
  const signedIn = await saveSession(payload, email);
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
}

/**
 * Native Sign in with Apple → Supabase id_token grant.
 * Resolves null when the person cancels the Apple sheet.
 * expo-apple-authentication is imported lazily — a static import registers a
 * native view at module scope and breaks web/server rendering.
 */
export async function signInWithApple(): Promise<{ email: string | null } | null> {
  assertSyncEnabled();

  const AppleAuthentication = await import('expo-apple-authentication');
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
  return { email };
}

/** Supabase returns OAuth tokens in the URL fragment (#access_token=…&…). */
function parseFragmentParams(url: string): Record<string, string | undefined> {
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) params[key] = decodeURIComponent(value);
  }
  return params;
}

function emailFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(normalized)) as { email?: string };
    return claims.email ?? null;
  } catch {
    return null;
  }
}
