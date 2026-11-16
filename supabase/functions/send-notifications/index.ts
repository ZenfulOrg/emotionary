// send-notifications — runs every 15 minutes (pg_cron) and on demand from
// the admin panel. Sends, per device and in its own time zone:
//   1. the daily word at the chosen time (deck rotation: every word once
//      before any repeats, new words join the next cycle),
//   2. triggered messages (streak reminder, inactivity, milestones…),
//   3. queued one-off messages from the admin panel.
// iOS goes straight to Apple (APNs). Android (FCM) is added with the Android
// release. Daily and triggered sends wait for push_settings.push_live, so
// devices keep their own local notifications until the server takes over.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { addDays, wordOfDay } from '../_shared/daily-engine.ts';
import { dailyNotificationContent } from '../_shared/notification-content.ts';
import type { Word } from '../_shared/word.ts';

type Device = {
  install_id: string;
  platform: 'ios' | 'android';
  token: string;
  apns_environment: 'development' | 'production' | null;
  timezone: string;
  notify_hour: number;
  notify_minute: number;
  enabled: boolean;
  plan: 'free' | 'paid';
  kept_slugs: string[];
  streak: number;
  last_open_date: string | null;
  last_daily_sent_on: string | null;
  created_at: string;
};

type Trigger = {
  id: string;
  kind: 'streak_rescue' | 'inactive_days' | 'streak_milestone' | 'days_since_install';
  days: number | null;
  title: string;
  body: string;
  url: string;
  audience: 'all' | 'free' | 'paid';
  send_hour: number;
};

type Message = {
  id: string;
  title: string;
  body: string;
  url: string;
  audience: 'all' | 'free' | 'paid';
  platform: 'ios' | 'android' | null;
};

type Push = { title: string; body: string; data: Record<string, string> };
type SendResult = 'sent' | 'failed' | 'gone' | 'skipped';

/** Daily and triggered messages go out within this many minutes of their time. */
const WINDOW_MINUTES = 180;
const CONCURRENCY = 20;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ---------------------------------------------------------------- time

function localNow(timeZone: string, now: Date): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function inWindow(minutes: number, startMinutes: number): boolean {
  return minutes >= startMinutes && minutes < startMinutes + WINDOW_MINUTES;
}

// ---------------------------------------------------------------- APNs

let apnsJwt: { token: string; at: number } | null = null;

function base64url(bytes: Uint8Array | string): string {
  const bin = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function apnsToken(): Promise<string | null> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const pem = Deno.env.get('APNS_PRIVATE_KEY');
  if (!keyId || !teamId || !pem) return null;
  // Apple accepts a token for up to an hour; refresh well before that.
  if (apnsJwt && Date.now() - apnsJwt.at < 40 * 60_000) return apnsJwt.token;

  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${claims}`)),
  );
  apnsJwt = { token: `${header}.${claims}.${base64url(signature)}`, at: Date.now() };
  return apnsJwt.token;
}

async function sendApns(device: Device, push: Push): Promise<SendResult> {
  const token = await apnsToken();
  if (!token) return 'skipped';
  const host =
    device.apns_environment === 'development' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const payload = {
    aps: { alert: { title: push.title, body: push.body }, sound: 'emotionary_chime.wav' },
    // expo-notifications reads "body" as the notification's data.
    body: push.data,
    ...push.data,
  };
  try {
    const res = await fetch(`${host}/3/device/${device.token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${token}`,
        'apns-topic': Deno.env.get('APNS_BUNDLE_ID') ?? 'com.nowdrops.emotionary',
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return 'sent';
    const reason = ((await res.json().catch(() => ({}))) as { reason?: string }).reason ?? '';
    if (res.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered') return 'gone';
    console.error('apns', res.status, reason);
    return 'failed';
  } catch (error) {
    console.error('apns network', String(error));
    return 'failed';
  }
}

async function send(device: Device, push: Push): Promise<SendResult> {
  if (device.platform === 'ios') return sendApns(device, push);
  return 'skipped'; // Android (FCM) arrives with the Android release.
}

async function recordResult(device: Device, result: SendResult) {
  if (result === 'sent') {
    await supabase
      .from('push_devices')
      .update({ consecutive_failures: 0 })
      .eq('install_id', device.install_id)
      .gt('consecutive_failures', 0);
  } else if (result === 'gone') {
    await supabase.from('push_devices').update({ enabled: false }).eq('install_id', device.install_id);
  } else if (result === 'failed') {
    await supabase.rpc('increment_push_failures', { p_install_id: device.install_id });
  }
}

async function inBatches<T>(items: T[], work: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(work));
  }
}

function matchesAudience(device: Device, audience: 'all' | 'free' | 'paid') {
  return audience === 'all' || device.plan === audience;
}

// ---------------------------------------------------------------- daily + triggers

async function loadWords(): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('id, slug, word, definition, is_free, published_at')
    .eq('published', true)
    .limit(10000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Word[];
}

function triggerEpisode(trigger: Trigger, device: Device, localDate: string): string | null {
  switch (trigger.kind) {
    case 'streak_rescue':
      return device.streak >= 1 && device.last_open_date === addDays(localDate, -1) ? localDate : null;
    case 'inactive_days':
      return trigger.days && device.last_open_date && device.last_open_date === addDays(localDate, -trigger.days)
        ? `inactive:${device.last_open_date}`
        : null;
    case 'streak_milestone':
      return trigger.days && device.streak === trigger.days && device.last_open_date === localDate
        ? `streak:${device.last_open_date}`
        : null;
    case 'days_since_install': {
      if (!trigger.days) return null;
      const installed = localNow(device.timezone, new Date(device.created_at)).date;
      return addDays(installed, trigger.days) === localDate ? 'once' : null;
    }
  }
}

async function runScheduled(now: Date, dryRun: boolean) {
  const stats = { daily: 0, triggered: 0, failed: 0, skipped: 0 };
  const [{ data: devices }, { data: triggers }, words] = await Promise.all([
    supabase.from('push_devices').select('*').eq('enabled', true).limit(100000),
    supabase.from('push_triggers').select('*').eq('enabled', true),
    loadWords(),
  ]);
  const cache = new Map<string, Word[]>();

  await inBatches((devices ?? []) as Device[], async (device) => {
    let local: { date: string; minutes: number };
    try {
      local = localNow(device.timezone, now);
    } catch {
      return;
    }

    // 1. Daily word at the device's chosen time, once per local day.
    if (
      device.last_daily_sent_on !== local.date &&
      inWindow(local.minutes, device.notify_hour * 60 + device.notify_minute)
    ) {
      const word = wordOfDay(words, local.date, cache);
      if (word) {
        const unlocked = device.plan === 'paid' || word.is_free || device.kept_slugs.includes(word.slug);
        if (dryRun) {
          stats.daily++;
        } else {
          // Claim the day first so overlapping runs never double-send.
          const { data: claimed } = await supabase
            .from('push_devices')
            .update({ last_daily_sent_on: local.date })
            .eq('install_id', device.install_id)
            .or(`last_daily_sent_on.is.null,last_daily_sent_on.neq.${local.date}`)
            .select('install_id');
          if (claimed?.length) {
            const result = await send(device, dailyNotificationContent(word, local.date, unlocked));
            if (result === 'sent') stats.daily++;
            else if (result === 'skipped') stats.skipped++;
            else stats.failed++;
            await recordResult(device, result);
          }
        }
      }
    }

    // 2. Triggered messages at their local hour.
    for (const trigger of (triggers ?? []) as Trigger[]) {
      if (!matchesAudience(device, trigger.audience)) continue;
      if (!inWindow(local.minutes, trigger.send_hour * 60)) continue;
      const episode = triggerEpisode(trigger, device, local.date);
      if (!episode) continue;
      if (dryRun) {
        stats.triggered++;
        continue;
      }
      const { data: claimed } = await supabase
        .from('push_trigger_sends')
        .upsert(
          { trigger_id: trigger.id, install_id: device.install_id, episode },
          { onConflict: 'trigger_id,install_id,episode', ignoreDuplicates: true },
        )
        .select('trigger_id');
      if (!claimed?.length) continue;
      const result = await send(device, {
        title: trigger.title,
        body: trigger.body,
        data: { url: trigger.url, trigger: trigger.kind },
      });
      if (result === 'sent') stats.triggered++;
      else if (result === 'skipped') stats.skipped++;
      else stats.failed++;
      await recordResult(device, result);
    }
  });
  return stats;
}

// ---------------------------------------------------------------- one-offs

async function runMessages(now: Date, dryRun: boolean) {
  const { data: due } = await supabase
    .from('push_messages')
    .select('*')
    .in('status', ['queued', 'sending'])
    .or(`send_after.is.null,send_after.lte.${now.toISOString()}`);
  const summary: Array<{ id: string; sent: number; failed: number }> = [];

  for (const message of (due ?? []) as Message[]) {
    let query = supabase.from('push_devices').select('*').eq('enabled', true).limit(100000);
    if (message.audience !== 'all') query = query.eq('plan', message.audience);
    if (message.platform) query = query.eq('platform', message.platform);
    const { data: devices } = await query;
    if (dryRun) {
      summary.push({ id: message.id, sent: devices?.length ?? 0, failed: 0 });
      continue;
    }
    await supabase.from('push_messages').update({ status: 'sending' }).eq('id', message.id);

    let sent = 0;
    let failed = 0;
    await inBatches((devices ?? []) as Device[], async (device) => {
      // Claim this delivery so a resumed run never sends twice.
      const { data: claimed } = await supabase
        .from('push_message_deliveries')
        .upsert(
          { message_id: message.id, install_id: device.install_id, ok: false },
          { onConflict: 'message_id,install_id', ignoreDuplicates: true },
        )
        .select('install_id');
      if (!claimed?.length) return;
      const result = await send(device, {
        title: message.title,
        body: message.body,
        data: { url: message.url, message: message.id },
      });
      if (result === 'sent') {
        sent++;
        await supabase
          .from('push_message_deliveries')
          .update({ ok: true })
          .eq('message_id', message.id)
          .eq('install_id', device.install_id);
      } else if (result !== 'skipped') {
        failed++;
      }
      await recordResult(device, result);
    });

    const { data: totals } = await supabase
      .from('push_message_deliveries')
      .select('ok')
      .eq('message_id', message.id);
    const okCount = (totals ?? []).filter((row) => row.ok).length;
    await supabase
      .from('push_messages')
      .update({
        status: 'sent',
        sent_count: okCount,
        failed_count: (totals?.length ?? 0) - okCount,
        finished_at: new Date().toISOString(),
      })
      .eq('id', message.id);
    summary.push({ id: message.id, sent, failed });
  }
  return summary;
}

// ---------------------------------------------------------------- entry

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Only pg_cron and the admin panel know this secret (generated in the database).
  const { data: secretRow } = await supabase.from('push_cron_secret').select('secret').single();
  const provided = req.headers.get('x-push-secret') ?? '';
  if (!secretRow?.secret || provided !== secretRow.secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const options = (await req.json().catch(() => ({}))) as { dryRun?: boolean; only?: 'messages' };
  const dryRun = options.dryRun === true;
  const now = new Date();

  const { data: settings } = await supabase.from('push_settings').select('push_live').single();
  const live = settings?.push_live === true;

  try {
    const scheduled = (live || dryRun) && options.only !== 'messages' ? await runScheduled(now, dryRun) : null;
    const messages = await runMessages(now, dryRun);
    return Response.json({ ok: true, live, dryRun, scheduled, messages, apnsConfigured: Boolean(await apnsToken()) });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
});
