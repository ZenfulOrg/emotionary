import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { GOOGLE_IOS_CLIENT_ID, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';
import { useUserStore } from '@/store/userStore';

const SESSION_KEY = 'emotionary.auth.session.v1';
const APPLE_USER_KEY = 'emotionary.auth.apple-user.v1';
let sessionRevision = 0;
let signingOut = false;

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
  user?: { email?: string; identities?: unknown[]; app_metadata?: Record<string, unknown> };
  identities?: unknown[];
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
  sessionRevision += 1;
  useUserStore.getState().setComplimentaryAccess(false);
  const session: AuthSession = { accessToken, refreshToken, email };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return true;
}

async function saveSession(payload: SupabaseAuthResponse, fallbackEmail: string) {
  if (!payload.access_token || !payload.refresh_token) return false;
  const saved = await saveSessionTokens(
    payload.access_token,
    payload.refresh_token,
    payload.user?.email ?? fallbackEmail.trim().toLowerCase(),
  );
  if (saved) useUserStore.getState().setComplimentaryAccess(
    payload.user?.app_metadata?.emotionary_full_access === true,
  );
  return saved;
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
  sessionRevision += 1;
  useUserStore.getState().setComplimentaryAccess(false);
  if (process.env.EXPO_OS !== 'web') await Promise.all([
    SecureStore.deleteItemAsync(SESSION_KEY), SecureStore.deleteItemAsync(APPLE_USER_KEY),
  ]);
}

async function freshSession(): Promise<AuthSession> {
  const revision = sessionRevision;
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
  if (revision !== sessionRevision || signingOut) throw new AuthError('Sign in again to continue.');
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
  // GoTrue can return an obfuscated user (at the response root) for an
  // already-confirmed account. No confirmation email is sent in this case.
  const identities = payload.user?.identities ?? payload.identities;
  if (!payload.access_token && Array.isArray(identities) && identities.length === 0) {
    throw new AuthError(
      'No new verification code was sent. If you already have an account, sign in with your password or the Apple or Google option you used before.',
      'signup_not_created',
    );
  }
  const signedIn = await saveSession(payload, email);
  return { requiresEmailConfirmation: !signedIn };
}

export async function signIn(email: string, password: string) {
  const payload = await requestAuth('token?grant_type=password', email, password);
  const signedIn = await saveSession(payload, email);
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
}

/** Shown when the server rejects a code. Each new code replaces the earlier ones. */
export const CODE_REJECTED =
  "That code didn't work. Each new code replaces the earlier ones, so use the code from your newest Emotionary email, or request a new code.";

/** Confirms an email/password signup with the code from the confirmation email. */
export async function verifySignupCode(email: string, code: string): Promise<AuthAccount> {
  // Digits only: a pasted code may carry spaces, dashes or a trailing period.
  const token = code.replace(/\D/g, '');
  if (!/^\d{6,10}$/.test(token)) throw new AuthError('Enter the verification code from your email.');
  const normalizedEmail = email.trim().toLowerCase();
  const payload = await authPost('verify', { email: normalizedEmail, token, type: 'email' });
  if (!(await saveSession(payload, normalizedEmail))) {
    throw new AuthError('Your session could not be saved securely. Please sign in again.');
  }
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
  return { email: payload.user?.email ?? normalizedEmail };
}

/**
 * Starts a password reset: Supabase emails a 6-digit code. Succeeds whether or
 * not an account exists for the address, so it can't be used to probe emails.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await authPost('recover', { email: email.trim().toLowerCase() });
}

/**
 * A recovery code works once. When the code is accepted but the new password
 * is turned down (too weak, say), the verified session is kept here so the
 * person can try another password with the same code instead of hearing that
 * their code is wrong.
 */
let verifiedRecovery: { email: string; token: string; payload: SupabaseAuthResponse } | null = null;

/**
 * Finishes a password reset in one step: the emailed code proves the address,
 * the new password is saved, and the person is signed in.
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
): Promise<AuthAccount> {
  // Digits only: a pasted code may carry spaces, dashes or a trailing period.
  const token = code.replace(/\D/g, '');
  if (!/^\d{6,10}$/.test(token)) throw new AuthError('Enter the code from your email.');
  if (newPassword.length < 8) throw new AuthError('Use at least 8 characters for your password.');
  const normalizedEmail = email.trim().toLowerCase();
  const reuse = verifiedRecovery?.email === normalizedEmail && verifiedRecovery.token === token;
  const payload = reuse
    ? verifiedRecovery!.payload
    : await authPost('verify', { email: normalizedEmail, token, type: 'recovery' });
  if (!payload.access_token) throw new AuthError(CODE_REJECTED);
  verifiedRecovery = { email: normalizedEmail, token, payload };

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${payload.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });
  } catch {
    throw new AuthError('Could not connect. Check your internet connection and try again.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as SupabaseAuthResponse;
    // The password typed is already theirs, and the code proved the address,
    // so there is nothing to change: sign them in.
    if (body.error_code !== 'same_password') {
      if (response.status === 401 || response.status === 403) {
        verifiedRecovery = null;
        throw new AuthError('This reset took too long. Request a new code and try again.', body.error_code, response.status);
      }
      const reason = body.msg ?? body.message ?? body.error_description ?? 'Your new password could not be saved.';
      throw new AuthError(`${reason} Try a different password.`, body.error_code, response.status);
    }
  }
  verifiedRecovery = null;

  if (!(await saveSession(payload, normalizedEmail))) {
    throw new AuthError('Your password was changed, but your session could not be saved. Sign in with your new password.');
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
 * Google sign-in. iOS uses Google's native sheet, which names the app
 * ("Emotionary") instead of the Supabase address, then trades Google's ID
 * token for a Supabase session (like Apple). Android still uses the browser
 * flow until its own Google client is set up.
 * Resolves null when the person cancels.
 */
export async function signInWithGoogle(): Promise<{ email: string | null } | null> {
  assertSyncEnabled();
  if (Platform.OS === 'ios') return signInWithGoogleNative();
  return signInWithGoogleBrowser();
}

async function signInWithGoogleNative(): Promise<{ email: string | null } | null> {
  // Lazy require: the native module only exists in native builds.
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID });

  let idToken: string | null = null;
  let accessToken: string | null = null;
  let googleEmail: string | null = null;
  try {
    // Always show the account picker, even after a previous Google sign-in.
    await GoogleSignin.signOut().catch(() => {});
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    idToken = response.data.idToken;
    googleEmail = response.data.user.email ?? null;
    // Supabase checks the ID token's at_hash against this (soon required).
    accessToken = (await GoogleSignin.getTokens().catch(() => null))?.accessToken ?? null;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
    throw new AuthError('Google sign-in is unavailable right now. Try again.');
  }
  if (!idToken) throw new AuthError('Google did not return a sign-in token. Try again.');

  const payload = await authPost('token?grant_type=id_token', {
    provider: 'google',
    id_token: idToken,
    ...(accessToken ? { access_token: accessToken } : {}),
  });
  const email = payload.user?.email ?? googleEmail ?? '';
  const signedIn = await saveSession(payload, email);
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
  return { email: email || null };
}

/** Google via the Supabase OAuth flow in an in-app browser session. */
async function signInWithGoogleBrowser(): Promise<{ email: string | null } | null> {

  const authUrl =
    `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
    `&redirect_to=${encodeURIComponent(OAUTH_REDIRECT)}`;
  // Ephemeral sessions skip iOS's "wants to use <project>.supabase.co to sign in" alert.
  const result = await WebBrowser.openAuthSessionAsync(authUrl, OAUTH_REDIRECT, {
    preferEphemeralSession: true,
  });
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
  await refreshComplimentaryAccess();
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
  const user = (await response.json().catch(() => ({}))) as {
    id?: string; email?: string; app_metadata?: Record<string, unknown>;
  };
  if (!response.ok || !user.id) throw new AuthError('This confirmation link is invalid or expired.');
  const email = user.email ?? '';
  const saved = await saveSessionTokens(accessToken, refreshToken, email);
  if (!saved) throw new AuthError('Your account was confirmed, but the session could not be saved.');
  useUserStore.getState().setComplimentaryAccess(user.app_metadata?.emotionary_full_access === true);
  await SecureStore.deleteItemAsync(APPLE_USER_KEY);
  return { email };
}

/** Wording version of the marketing opt-in, stored with each choice. */
export const MARKETING_CONSENT_VERSION = 'marketing-email-2026-11-13';

/**
 * Save the user's marketing-email choice on their own account (Supabase
 * user metadata), with when it was made and which wording they saw. Returns
 * false when signed out or offline; the caller retries later.
 */
export async function saveMarketingConsent(optedIn: boolean): Promise<boolean> {
  if (!syncEnabled || !(await readSession())) return false;
  try {
    const session = await freshSession();
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          marketing_opt_in: optedIn,
          marketing_opt_in_changed_at: new Date().toISOString(),
          marketing_consent_version: MARKETING_CONSENT_VERSION,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAuthAccount(): Promise<AuthAccount | null> {
  const session = await readSession();
  return session ? { email: session.email || emailFromJwt(session.accessToken) || 'Signed in' } : null;
}

/** The signed-in account's id (the session's subject), or null when signed out. */
export async function getAuthUserId(): Promise<string | null> {
  const session = await readSession().catch(() => null);
  return session ? jwtClaims(session.accessToken)?.sub ?? null : null;
}

/** Only server-managed metadata returned by Auth can grant complimentary access.
 * Never trust an email allowlist, incoming JWT claims, or user-editable metadata.
 * Grants are memory-only and revalidated on launch/foreground; failures fail closed.
 */
export async function refreshComplimentaryAccess(): Promise<void> {
  if (signingOut || !syncEnabled || !(await readSession())) {
    useUserStore.getState().setComplimentaryAccess(false);
    return;
  }
  let revision = sessionRevision;
  try {
    const session = await freshSession();
    revision = sessionRevision;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    const user = (await response.json().catch(() => ({}))) as {
      id?: string; app_metadata?: Record<string, unknown>;
    };
    if (revision !== sessionRevision || signingOut) return;
    useUserStore.getState().setComplimentaryAccess(
      response.ok && !!user.id && user.app_metadata?.emotionary_full_access === true,
    );
  } catch {
    if (revision === sessionRevision) useUserStore.getState().setComplimentaryAccess(false);
  }
}

/** Revokes the current session when possible and always removes it from this device. */
export async function signOut() {
  signingOut = true;
  sessionRevision += 1;
  useUserStore.getState().setComplimentaryAccess(false);
  try {
    const session = await readSession();
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
    try { await clearSession(); } finally { signingOut = false; }
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

function jwtClaims(token: string): { email?: string; exp?: number; sub?: string } | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as { email?: string; exp?: number; sub?: string };
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
