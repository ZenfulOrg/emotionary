import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { decideUpdatePrompt, type RemoteAppConfig, type UpdatePrompt } from '@/app-config/version';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';

/**
 * Remote app settings (public.app_config). Fetched on launch and foreground,
 * cached so an offline launch behaves like the last online one. Any failure
 * leaves the previous value in place, and no value at all means no prompt.
 */

const CONFIG_KEY = 'emotionary.appConfig.v1';
const DISMISSED_KEY = 'emotionary.updateDismissed.v1';
const COLUMNS =
  'ios_latest_version,ios_min_version,android_latest_version,android_min_version,update_message';

export const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id6803190171'
    : 'https://play.google.com/store/apps/details?id=com.emotionary.app';

interface AppConfigState {
  config: RemoteAppConfig | null;
  dismissedVersion: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  dismiss: (version: string) => void;
}

export const useAppConfigStore = create<AppConfigState>()((set) => ({
  config: null,
  dismissedVersion: null,

  hydrate: async () => {
    try {
      const [config, dismissed] = await Promise.all([
        AsyncStorage.getItem(CONFIG_KEY),
        AsyncStorage.getItem(DISMISSED_KEY),
      ]);
      set({
        config: config ? (JSON.parse(config) as RemoteAppConfig) : null,
        dismissedVersion: dismissed,
      });
    } catch {
      // no cached config: behave as if the table were empty
    }
  },

  refresh: async () => {
    if (!syncEnabled) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config?select=${COLUMNS}&id=eq.1`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!res.ok) return;
      const rows = (await res.json()) as RemoteAppConfig[];
      const config = rows[0] ?? null;
      set({ config });
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // offline or transient: keep the cached value
    }
  },

  dismiss: (version) => {
    set({ dismissedVersion: version });
    void AsyncStorage.setItem(DISMISSED_KEY, version).catch(() => {});
  },
}));

/** The installed store version (with appVersion runtime policy, also the OTA runtime). */
export function installedVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

export function useUpdatePrompt(): UpdatePrompt {
  const config = useAppConfigStore((s) => s.config);
  const dismissedVersion = useAppConfigStore((s) => s.dismissedVersion);
  return decideUpdatePrompt(installedVersion(), Platform.OS, config, dismissedVersion);
}
