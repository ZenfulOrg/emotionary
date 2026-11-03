import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { REVENUECAT_API_KEY } from '@/config';
import { useUserStore } from '@/store/userStore';

/** Store product ids, unchanged from the pre-RevenueCat builds so existing buyers keep access. */
export const PRODUCT_IDS = {
  yearly: 'com.nowdrops.emotionary.pro.yearly',
  lifetime: 'com.nowdrops.emotionary.pro.lifetime',
} as const;
export type Plan = keyof typeof PRODUCT_IDS;

/** RevenueCat entitlement that both plans (and any experiment products) unlock. */
export const ENTITLEMENT_ID = 'pro';

export type StoreProduct = { id: string; displayPrice: string; freeTrialDays?: number };
export type PurchaseResult = { status: 'purchased'; active: boolean } | { status: 'cancelled' | 'pending' };

const ready = Platform.OS !== 'web' && REVENUECAT_API_KEY.length > 0;
let configured = false;
let packages: PurchasesPackage[] = [];

function configure() {
  if (!ready) throw new Error('Purchases are unavailable in this build.');
  if (configured) return;
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  configured = true;
}

/** Android product ids from RevenueCat look like `product:basePlan`. */
const baseId = (id: string) => id.split(':')[0];

export function applyEntitlements(info: Pick<CustomerInfo, 'entitlements'>) {
  const active = Boolean(info.entitlements.active[ENTITLEMENT_ID]);
  useUserStore.getState().setStoreAccess(active);
  return active;
}

const TRIAL_UNIT_DAYS = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 } as const;
function trialDays(pkg: PurchasesPackage): number | undefined {
  const product = pkg.product;
  const free = product.defaultOption?.freePhase?.billingPeriod;
  if (free) return free.value * TRIAL_UNIT_DAYS[free.unit as keyof typeof TRIAL_UNIT_DAYS];
  const intro = product.introPrice;
  if (intro && intro.price === 0) return intro.periodNumberOfUnits * TRIAL_UNIT_DAYS[intro.periodUnit as keyof typeof TRIAL_UNIT_DAYS];
  return undefined;
}

/**
 * Products come from the offering RevenueCat serves to this user, so
 * experiments can change the lineup, prices and trials without a release.
 */
export async function loadProducts(): Promise<StoreProduct[]> {
  configure();
  const offerings = await Purchases.getOfferings();
  packages = offerings.current?.availablePackages ?? [];
  return packages.map((pkg) => ({
    id: baseId(pkg.product.identifier),
    displayPrice: pkg.product.priceString,
    freeTrialDays: trialDays(pkg),
  }));
}

export async function refreshPurchases() {
  if (!ready) return applyEntitlements({ entitlements: { active: {}, all: {}, verification: undefined } as never });
  configure();
  return applyEntitlements(await Purchases.getCustomerInfo());
}

export async function purchasePlan(plan: Plan): Promise<PurchaseResult> {
  configure();
  const pkg = packages.find((p) => baseId(p.product.identifier) === PRODUCT_IDS[plan]);
  if (!pkg) throw new Error('This plan is no longer available. Please refresh and try again.');
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'purchased', active: applyEntitlements(customerInfo) };
  } catch (error) {
    const code = (error as { code?: string; userCancelled?: boolean }).code;
    if ((error as { userCancelled?: boolean }).userCancelled || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { status: 'cancelled' };
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: 'pending' };
    throw error;
  }
}

export async function restorePurchases() {
  configure();
  return applyEntitlements(await Purchases.restorePurchases());
}

export function observePurchases() {
  if (!ready) return () => {};
  configure();
  const listener = (info: CustomerInfo) => { applyEntitlements(info); };
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
}
