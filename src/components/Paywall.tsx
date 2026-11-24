import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, OptionRow, Planets, RoundCta } from '@/components/brand';
import { lightImpactHaptic, successHaptic } from '@/feedback/haptics';
import { loadProducts, PRODUCT_IDS, purchasePlan, restorePurchases, type Plan } from '@/purchases/client';
import { GroundProvider } from '@/theme/ground';
import { brand, space } from '@/theme/tokens';
import { currentPaywallPlacement, track } from '@/analytics/track';


const PLANS: Record<Plan, { title: string; body: string; eyebrow?: string }> = {
  yearly: { title: 'Yearly', body: 'Billed yearly. Less than your coffee.' },
  lifetime: { title: 'Lifetime', body: 'One time, yours to keep.', eyebrow: 'Best value' },
};

/**
 * Store prices, plan choice and the purchase itself, shared by the full
 * paywall and the unlock sheet so both behave the same.
 */
export function usePlanPurchase(onPurchased: () => void) {
  const [plan, setPlan] = useState<Plan>('lifetime');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [trialDays, setTrialDays] = useState(0);
  const yearlyTrial = trialDays > 0;
  const store = Platform.OS === 'android' ? 'Google Play' : 'your Apple account settings';
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => loadProducts().then((products) => {
    setPrices(Object.fromEntries(products.map((product) => [product.id, product.displayPrice])));
    setTrialDays(products.find((product) => product.id === PRODUCT_IDS.yearly)?.freeTrialDays ?? 0);
    if (!products.length) setError('Purchases are temporarily unavailable. You can continue free and try again later.');
  }).catch(() => {
    setError('Unable to reach the store. Check your connection or continue free.');
  }).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  const reload = () => {
    setLoading(true);
    setError(null);
    void load();
  };

  const unlock = async () => {
    if (operation.current || !prices[PRODUCT_IDS[plan]]) return;
    operation.current = true;
    setBusy(true);
    lightImpactHaptic();
    const placement = currentPaywallPlacement();
    track('purchase_started', { product: plan, placement });
    try {
      const result = await purchasePlan(plan);
      track(result.status === 'cancelled' ? 'purchase_failed' : 'purchase_completed', {
        product: plan,
        placement,
        status: result.status,
      });
      if (result.status === 'purchased' && result.active) {
        successHaptic();
        onPurchased();
      } else if (result.status === 'pending') {
        Alert.alert('Purchase pending', 'Your store is waiting for approval. Full access will appear automatically when the purchase completes.');
      } else if (result.status === 'purchased') {
        Alert.alert('Checking your purchase', 'Open Settings and use Restore purchases to refresh your purchases.');
      }
    } catch (cause) {
      track('purchase_failed', { product: plan, placement, status: 'error' });
      Alert.alert('Purchase could not be completed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { operation.current = false; setBusy(false); }
  };

  return { plan, setPlan, prices, trialDays, yearlyTrial, store, loading, busy, error, reload, unlock };
}

/** Full access, on cream: two square plans and the round CTA, last. */
export function Paywall({
  onContinue,
  onContinueFree,
  eyebrow = 'Full access',
  title = 'Every word,\nevery month.',
  subtitle,
  freeLabel = 'Continue free',
  showPlanets = true,
}: {
  onContinue: () => void;
  onContinueFree: () => void;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  freeLabel?: string;
  showPlanets?: boolean;
}) {
  const { plan, setPlan, prices, trialDays, yearlyTrial, store, loading, busy, error, reload, unlock } =
    usePlanPurchase(onContinue);
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    if (restoring || busy) return;
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) onContinue();
      else Alert.alert('No purchases found', 'This store account has no Emotionary purchase to restore.', undefined, { cancelable: true });
    } catch {
      Alert.alert('Could not restore', 'Check your connection and store account, then try again.', undefined, { cancelable: true });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {showPlanets && <View style={styles.planets}><Planets /></View>}
      <Eyebrow style={styles.centeredText}>{eyebrow}</Eyebrow>
      <Headline size={44} style={styles.title}>
        {title}
      </Headline>
      <Body tone="muted" style={styles.subtitle}>
        {subtitle ?? (Platform.OS === 'android'
          ? "The full emotional vocabulary dictionary, every word's origin (its roots, history and cultural background), and future word updates."
          : "The full emotional vocabulary dictionary, every word's origin (its roots, history and cultural background), every widget theme, and future word updates.")}
      </Body>

      <View style={styles.options} accessibilityRole="radiogroup">
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const option = PLANS[key];
          const price = prices[PRODUCT_IDS[key]] ?? '…';
          const body = key === 'yearly' && (Platform.OS === 'android' || yearlyTrial)
            ? yearlyTrial ? `${trialDays} days free, then ${price}/year. Auto-renews; cancel anytime.` : `${price}/year. Auto-renews; cancel anytime.`
            : option.body;
          return (
            <GroundProvider key={key} ground={plan === key ? 'ink' : 'cream'}>
              <View style={plan === key ? styles.selectedPlan : undefined}>
                <OptionRow
                  role="radio"
                  selected={plan === key}
                  onPress={() => { if (!busy) setPlan(key); }}
                  eyebrow={option.eyebrow}
                  title={option.title}
                  body={body}
                  accessibilityLabel={`${option.title}, ${price}. ${body}`}
                  aside={<Headline accessibilityRole="text" size={30}>{price}</Headline>}
                />
              </View>
            </GroundProvider>
          );
        })}
      </View>

      {error && <Body size={14} tone="muted" style={styles.notice}>{error}</Body>}
      {!loading && !prices[PRODUCT_IDS[plan]] && <Button label="Try again" variant="link" disabled={busy} onPress={reload} />}
      {(Platform.OS === 'android' || yearlyTrial) && plan === 'yearly' && <Body size={14} tone="muted" style={styles.notice}>
        {yearlyTrial
          ? `Cancel in ${store} before the ${trialDays}-day trial ends to avoid the yearly charge. Subscription renews yearly until canceled.`
          : `Subscription renews yearly until canceled. Manage or cancel anytime in ${store}.`}
      </Body>}
      <View style={styles.actions}>
        <Button label={freeLabel} variant="link" disabled={busy} onPress={onContinueFree} />
        <RoundCta
          label={busy ? 'Working…' : plan === 'yearly' ? yearlyTrial ? 'Start free trial' : 'Subscribe' : 'Buy lifetime'}
          disabled={busy || loading || !prices[PRODUCT_IDS[plan]]}
          onPress={() => void unlock()}
          size={112}
          accessibilityHint={`Unlocks ${plan} full access`}
        />
      </View>
      <View style={styles.legal}>
        <Button
          label={restoring ? 'Restoring…' : 'Restore'}
          variant="link"
          disabled={busy || restoring}
          onPress={() => void restore()}
        />
        <Button label="Terms" variant="link" onPress={() => router.push('/legal/terms' as Href)} />
        <Button label="Privacy" variant="link" onPress={() => router.push('/legal/privacy' as Href)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  centeredText: { textAlign: 'center' },
  // Room above for the tilt, the glow and the breathing, so no dot is clipped.
  planets: { alignItems: 'center', paddingTop: space.m, marginBottom: space.m },
  selectedPlan: { backgroundColor: brand.ink },
  title: { marginTop: space.s, textAlign: 'center' },
  subtitle: { marginTop: space.m, maxWidth: 320, alignSelf: 'center', textAlign: 'center' },
  options: { gap: space.s, marginTop: space.l },
  notice: { marginTop: space.m, lineHeight: 19 },
  legal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: space.l,
    marginTop: space.m,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.l,
  },
});
