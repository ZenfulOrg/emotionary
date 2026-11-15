import { getAuthUserId } from '@/auth/client';
import { identifyPurchaser } from '@/purchases/client';

/**
 * Links store purchases to the signed-in account (RevenueCat app user id =
 * Supabase user id). Safe to call any time: does nothing when signed out,
 * and a failure leaves access as it was until the next launch retries.
 */
export async function linkPurchasesToAccount(): Promise<void> {
  try {
    const userId = await getAuthUserId();
    if (userId) await identifyPurchaser(userId);
  } catch {
    // Offline or store unavailable: retried on the next launch.
  }
}
