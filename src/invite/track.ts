import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';
import type { InviteMoment } from '@/invite/schedule';
import { installId } from '@/telemetry/deviceStatus';

/**
 * Anonymous invite stats (public.invite_events): when the pop-up shows, is
 * shared or dismissed, and shares from the Stats row. Keyed by the same
 * random install id as device status, never linked to an account. Failures
 * are silent; a lost event only makes the counts a little low.
 */
export type InviteEvent = 'shown' | 'shared' | 'dismissed';
export type InviteSource = InviteMoment | 'stats' | 'requested';

export function trackInvite(event: InviteEvent, source: InviteSource): void {
  if (!syncEnabled || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  const platform = Platform.OS;
  void (async () => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/report_invite_event`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_install_id: await installId(),
          p_event: event,
          p_source: source,
          p_platform: platform,
          p_app_version: Constants.expoConfig?.version ?? null,
        }),
      });
    } catch {
      // offline: drop it
    }
  })();
}
