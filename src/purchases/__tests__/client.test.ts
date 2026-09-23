import Purchases from '../../../modules/emotionary-purchases/src/EmotionaryPurchasesModule';
import { applyEntitlements, PRODUCT_IDS, purchasePlan, restorePurchases } from '../client';
import { useUserStore } from '@/store/userStore';

jest.mock('../../../modules/emotionary-purchases/src/EmotionaryPurchasesModule', () => ({
  __esModule: true,
  default: { purchase: jest.fn(), restore: jest.fn() },
}));
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const native = Purchases!;
beforeEach(() => { jest.clearAllMocks(); useUserStore.setState({ accessLevel: 'free' }); });

test('only recognized verified store entitlements grant access, empty results revoke it', () => {
  expect(applyEntitlements({ productIDs: ['unknown.product'] })).toBe(false);
  expect(applyEntitlements({ productIDs: [PRODUCT_IDS.lifetime] })).toBe(true);
  expect(applyEntitlements({ productIDs: [] })).toBe(false);
  expect(useUserStore.getState().accessLevel).toBe('free');
});
test.each(['cancelled', 'pending'])('%s purchases never unlock access', async status => {
  (native.purchase as jest.Mock).mockResolvedValue({ status });
  await purchasePlan('yearly');
  expect(useUserStore.getState().accessLevel).toBe('free');
});
test('purchase failures never unlock access', async () => {
  (native.purchase as jest.Mock).mockRejectedValue(new Error('Unverified transaction'));
  await expect(purchasePlan('lifetime')).rejects.toThrow();
  expect(useUserStore.getState().accessLevel).toBe('free');
});
test('successful purchase and restore use returned Apple entitlement', async () => {
  (native.purchase as jest.Mock).mockResolvedValue({ status: 'purchased', entitlements: { productIDs: [PRODUCT_IDS.yearly] } });
  await purchasePlan('yearly');
  expect(native.purchase).toHaveBeenCalledWith(PRODUCT_IDS.yearly);
  expect(useUserStore.getState().accessLevel).toBe('full');
  (native.restore as jest.Mock).mockResolvedValue({ productIDs: [] });
  expect(await restorePurchases()).toBe(false);
});
test('hydrating the beta flag cannot grant paid access or overwrite StoreKit state', () => {
  const merge = useUserStore.persist.getOptions().merge!;
  const current = useUserStore.getState();
  expect(merge({ accessLevel: 'full', favorites: ['joy'] }, current).accessLevel).toBe('free');
  expect(merge({ accessLevel: 'free' }, { ...current, accessLevel: 'full' }).accessLevel).toBe('full');
  expect(useUserStore.persist.getOptions().partialize!(current)).not.toHaveProperty('accessLevel');
});
