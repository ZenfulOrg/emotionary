import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { EmotionaryPurchasesModuleEvents, Entitlements, PurchaseResult, StoreProduct } from './EmotionaryPurchases.types';

declare class EmotionaryPurchasesModule extends NativeModule<EmotionaryPurchasesModuleEvents> {
  getProducts(): Promise<StoreProduct[]>;
  getEntitlements(): Promise<Entitlements>;
  purchase(productID: string): Promise<PurchaseResult>;
  restore(): Promise<Entitlements>;
}
export default requireOptionalNativeModule<EmotionaryPurchasesModule>('EmotionaryPurchases');
