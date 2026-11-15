import { saveMarketingConsent } from '@/auth/client';
import { useUserStore } from '@/store/userStore';

/**
 * Push a pending marketing-email choice to the signed-in account. Safe to
 * call any time (after sign-in, on launch, after toggling): it does nothing
 * when there is no pending choice or no session, and retries next time.
 */
export async function syncMarketingConsent(): Promise<void> {
  const { marketingOptIn, marketingPending, markMarketingSaved } = useUserStore.getState();
  if (marketingOptIn === null || !marketingPending) return;
  try {
    if (await saveMarketingConsent(marketingOptIn)) {
      // Only clear if the choice didn't change while saving.
      if (useUserStore.getState().marketingOptIn === marketingOptIn) markMarketingSaved();
    }
  } catch {
    // Offline or no stored session yet: stays pending and retries later.
    // Never let this interrupt sign-in or sign-up.
  }
}
