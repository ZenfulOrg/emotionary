import { Platform } from 'react-native';

/**
 * Supabase connection config. Both values are safe to ship in the app
 * (the publishable key is designed for client embedding; RLS enforces
 * read-only access to published words through RLS — DESIGN.md §6.2).
 *
 * Native Xcode archives do not inherit the old EAS environment, so the
 * production project is the fallback. EXPO_PUBLIC_* values can still
 * override it for local development or a future backend migration.
 */
const PRODUCTION_SUPABASE_URL = 'https://zqrdwqvkofhxfxkondmx.supabase.co';
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_TWjndclOWeVh4WBMi4aXeQ_LgRM2YRy';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? PRODUCTION_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? PRODUCTION_SUPABASE_PUBLISHABLE_KEY;

export const syncEnabled = SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

/**
 * RevenueCat public SDK keys (safe to ship; they are write-only identifiers).
 * Native Xcode archives do not inherit EAS env, so the keys are inlined.
 */
const PRODUCTION_REVENUECAT_IOS_KEY = 'appl_DuPtVLDUqSuSpmSsVFZsIDkmhDM';
const PRODUCTION_REVENUECAT_ANDROID_KEY = 'goog_QPLygoUDcsEsyMgKTmujjUrnQpn';

export const REVENUECAT_API_KEY =
  (Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? PRODUCTION_REVENUECAT_IOS_KEY
    : Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? PRODUCTION_REVENUECAT_ANDROID_KEY
      : '');
