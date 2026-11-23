import { daysSinceEpoch, localDateString } from '@/daily/engine';
import { setCustomerAttributes } from '@/purchases/client';
import { useUserStore } from '@/store/userStore';
import { widgetCount } from '@/telemetry/deviceStatus';

/**
 * Habits RevenueCat keeps on each customer, so revenue and conversion can be
 * split by them (docs/analytics-plan.md). Refreshed on every app open;
 * RevenueCat only uploads values that changed. Never throws.
 *
 * No install id here: it would let the anonymous `events` table be joined to
 * an account (docs/privacy-update-draft.md). The empty value removes the
 * install_id that 1.8.1 test builds already set.
 */
export async function syncCustomerAttributes(): Promise<void> {
  try {
    const user = useUserStore.getState();
    const today = localDateString();
    const widgets = await widgetCount();
    await setCustomerAttributes({
      install_id: '',
      streak: String(user.streakState.streak),
      notifications_on: String(user.notifEnabled),
      widget_count: widgets < 0 ? '' : String(widgets),
      words_saved: String(user.favorites.length),
      words_read: String(user.readSlugs.length),
      words_shared: String(user.sharedCount),
      days_since_install: user.welcomeDate ? String(daysSinceEpoch(today) - daysSinceEpoch(user.welcomeDate)) : '',
    });
  } catch {
    // RevenueCat unavailable (web, offline, simulator without a key): skip.
  }
}
