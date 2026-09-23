import Purchases from '../../modules/emotionary-purchases/src/EmotionaryPurchasesModule';
import type { Entitlements } from '../../modules/emotionary-purchases/src/EmotionaryPurchases.types';
import { useUserStore } from '@/store/userStore';

export const PRODUCT_IDS = {
  yearly: 'com.nowdrops.emotionary.pro.yearly',
  lifetime: 'com.nowdrops.emotionary.pro.lifetime',
} as const;
export type Plan = keyof typeof PRODUCT_IDS;
const knownProducts = new Set<string>(Object.values(PRODUCT_IDS));

export function applyEntitlements(value: Entitlements) {
  const active = value.productIDs.some((id) => knownProducts.has(id));
  useUserStore.getState().setStoreAccess(active);
  return active;
}

function nativePurchases() {
  if (!Purchases) throw new Error('Purchases are available in the Emotionary iPhone app.');
  return Purchases;
}

export const loadProducts = async () => nativePurchases().getProducts();
export async function refreshPurchases() {
  if (!Purchases) return applyEntitlements({ productIDs: [] });
  return applyEntitlements(await Purchases.getEntitlements());
}
export async function purchasePlan(plan: Plan) {
  const result = await nativePurchases().purchase(PRODUCT_IDS[plan]);
  if (result.status === 'purchased') applyEntitlements(result.entitlements);
  return result;
}
export async function restorePurchases() {
  return applyEntitlements(await nativePurchases().restore());
}
export function observePurchases() {
  const subscription = Purchases?.addListener('onEntitlementsChanged', applyEntitlements);
  return () => subscription?.remove();
}
