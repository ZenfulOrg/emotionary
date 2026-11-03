import Purchases from 'react-native-purchases';

import { applyEntitlements, ENTITLEMENT_ID, loadProducts, PRODUCT_IDS, purchasePlan, restorePurchases } from '../client';
import { useUserStore } from '@/store/userStore';

jest.mock('@/config', () => ({ REVENUECAT_API_KEY: 'test_key' }));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(), setLogLevel: jest.fn(), getOfferings: jest.fn(), purchasePackage: jest.fn(),
    restorePurchases: jest.fn(), getCustomerInfo: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(), removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1', PAYMENT_PENDING_ERROR: '20' },
}));
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const rc = jest.mocked(Purchases);
const info = (active: boolean) => ({ entitlements: { active: active ? { [ENTITLEMENT_ID]: {} } : {} } }) as never;
const pkg = (id: string) => ({ product: { identifier: id, priceString: '$11.99', introPrice: null, defaultOption: null } });

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ accessLevel: 'free', storeAccess: false, complimentaryAccess: false });
  rc.getOfferings.mockResolvedValue({ current: { availablePackages: [pkg(`${PRODUCT_IDS.yearly}:yearly`), pkg(PRODUCT_IDS.lifetime)] } } as never);
});

test('only the pro entitlement grants access, and empty results revoke it', () => {
  expect(applyEntitlements(info(false))).toBe(false);
  expect(applyEntitlements(info(true))).toBe(true);
  expect(useUserStore.getState().accessLevel).toBe('full');
  expect(applyEntitlements(info(false))).toBe(false);
  expect(useUserStore.getState().accessLevel).toBe('free');
});
test('offering products are normalized to the store product ids', async () => {
  expect((await loadProducts()).map((p) => p.id)).toEqual([PRODUCT_IDS.yearly, PRODUCT_IDS.lifetime]);
});
test.each([[{ userCancelled: true }, 'cancelled'], [{ code: '20' }, 'pending']])('%j purchases never unlock access', async (error, status) => {
  await loadProducts();
  rc.purchasePackage.mockRejectedValue(error);
  expect(await purchasePlan('yearly')).toEqual({ status });
  expect(useUserStore.getState().accessLevel).toBe('free');
});
test('purchase failures never unlock access', async () => {
  await loadProducts();
  rc.purchasePackage.mockRejectedValue(new Error('boom'));
  await expect(purchasePlan('lifetime')).rejects.toThrow('boom');
  expect(useUserStore.getState().accessLevel).toBe('free');
});
test('successful purchase unlocks and restore revokes when nothing is active', async () => {
  await loadProducts();
  rc.purchasePackage.mockResolvedValue({ customerInfo: info(true) } as never);
  expect(await purchasePlan('yearly')).toEqual({ status: 'purchased', active: true });
  expect(useUserStore.getState().accessLevel).toBe('full');
  rc.restorePurchases.mockResolvedValue(info(false));
  expect(await restorePurchases()).toBe(false);
});
test('hydrating the beta flag cannot grant paid access or overwrite store state', () => {
  const merge = useUserStore.persist.getOptions().merge!;
  const current = useUserStore.getState();
  expect(merge({ accessLevel: 'full', favorites: ['joy'] }, current).accessLevel).toBe('free');
  expect(merge({ accessLevel: 'free', storeAccess: false, complimentaryAccess: false }, { ...current, accessLevel: 'full' }).accessLevel).toBe('full');
  expect(useUserStore.persist.getOptions().partialize!(current)).not.toHaveProperty('accessLevel');
});
test('persisted account/store grants cannot unlock access after hydration', () => {
  const current = useUserStore.getState();
  const merge = useUserStore.persist.getOptions().merge!;
  const merged = merge({ accessLevel: 'full', complimentaryAccess: true, storeAccess: true }, current);
  expect(merged.accessLevel).toBe('free');
  expect(merged.complimentaryAccess).toBe(false);
  expect(merged.storeAccess).toBe(false);
  const persisted = useUserStore.persist.getOptions().partialize!(current);
  expect(persisted).not.toHaveProperty('complimentaryAccess');
  expect(persisted).not.toHaveProperty('storeAccess');
});
