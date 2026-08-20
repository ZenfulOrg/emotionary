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
