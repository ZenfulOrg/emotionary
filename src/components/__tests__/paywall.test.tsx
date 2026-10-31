import React from 'react';
import { Platform } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Paywall } from '@/components/Paywall';
import { loadProducts, PRODUCT_IDS, purchasePlan } from '@/purchases/client';
import { Body, OptionRow, RoundCta } from '@/components/brand';

jest.mock('@/purchases/client', () => ({
  PRODUCT_IDS: { yearly: 'yearly', lifetime: 'lifetime' },
  loadProducts: jest.fn(), purchasePlan: jest.fn(),
}));
jest.mock('@/components/brand', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const component = (name: string) => function MockComponent(props: object) { return React.createElement(name, props); };
  return Object.fromEntries(['Body', 'Button', 'Eyebrow', 'Headline', 'OptionRow', 'Planets', 'RoundCta'].map((name) => [name, component(name)]));
});
jest.mock('@/theme/ground', () => ({ GroundProvider: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/feedback/haptics', () => ({ lightImpactHaptic: jest.fn(), successHaptic: jest.fn() }));

const originalOS = Platform.OS;
let screen: ReactTestRenderer;
afterEach(() => { if (screen) act(() => screen.unmount()); Platform.OS = originalOS; jest.clearAllMocks(); });

async function openYearly(freeTrialDays?: number) {
  Platform.OS = 'android';
  jest.mocked(loadProducts).mockResolvedValue([
    { id: PRODUCT_IDS.yearly, displayPrice: '$11.99', freeTrialDays },
    { id: PRODUCT_IDS.lifetime, displayPrice: '$19.99' },
  ]);
  await act(async () => { screen = create(<Paywall onContinue={jest.fn()} onContinueFree={jest.fn()} />); });
  const yearly = screen.root.findAllByType(OptionRow)[0];
  act(() => yearly.props.onPress());
  return yearly;
}

test('eligible trial explains renewal price and launches yearly purchase', async () => {
  const yearly = await openYearly(7);
  expect(yearly.props.body).toBe('7 days free, then $11.99/year. Auto-renews; cancel anytime.');
  const cta = screen.root.findByType(RoundCta);
  expect(cta.props.label).toBe('Start free trial');
  expect(screen.root.findAllByType(Body).map((body) => body.props.children).join(' ')).toContain('Cancel in Google Play before the 7-day trial ends');
  jest.mocked(purchasePlan).mockResolvedValue({ status: 'cancelled' });
  await act(async () => { cta.props.onPress(); });
  expect(purchasePlan).toHaveBeenCalledWith('yearly');
});

test.each([undefined, 0])('does not promise a trial when Play reports no eligibility (%s)', async (days) => {
  const yearly = await openYearly(days);
  expect(yearly.props.body).toBe('$11.99/year. Auto-renews; cancel anytime.');
  expect(screen.root.findByType(RoundCta).props.label).toBe('Subscribe');
  expect(screen.root.findAllByType(Body).map((body) => body.props.children).join(' ')).not.toContain('7-day trial');
});
