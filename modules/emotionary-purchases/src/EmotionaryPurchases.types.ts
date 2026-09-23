export type StoreProduct = { id: string; displayPrice: string };
export type Entitlements = { productIDs: string[] };
export type PurchaseResult =
  | { status: 'purchased'; entitlements: Entitlements }
  | { status: 'pending' | 'cancelled' };
export type EmotionaryPurchasesModuleEvents = {
  onEntitlementsChanged: (params: Entitlements) => void;
};
