export type StoreProduct = { id: string; displayPrice: string; freeTrialDays?: number };
export type Entitlements = { productIDs: string[] };
export type PurchaseResult =
  | { status: 'purchased'; entitlements: Entitlements }
  | { status: 'pending' | 'cancelled' };
export type EmotionaryPurchasesModuleEvents = {
  onEntitlementsChanged: (params: Entitlements) => void;
};
