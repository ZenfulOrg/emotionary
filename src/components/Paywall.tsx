import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, OptionRow, Planets, RoundCta } from '@/components/brand';
import { lightImpactHaptic, successHaptic } from '@/feedback/haptics';
import { loadProducts, PRODUCT_IDS, purchasePlan, restorePurchases, type Plan } from '@/purchases/client';
import { GroundProvider } from '@/theme/ground';
import { brand, space } from '@/theme/tokens';


const PLANS: Record<Plan, { title: string; body: string; eyebrow?: string }> = {
  yearly: { title: 'Yearly', body: 'Billed yearly. Renews automatically.' },
  lifetime: { title: 'Lifetime', body: 'One time, yours to keep.', eyebrow: 'Best value' },
};

/** Full access, on cream: two square plans and the round CTA, last. */
export function Paywall({
  onContinue,
  onContinueFree,
}: {
  onContinue: () => void;
  onContinueFree: () => void;
}) {
  const [plan, setPlan] = useState<Plan>('lifetime');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => loadProducts().then((products) => {
    setPrices(Object.fromEntries(products.map((product) => [product.id, product.displayPrice])));
    if (!products.length) setError('Purchases are temporarily unavailable. You can continue free and try again later.');
  }).catch(() => {
    setError('Unable to reach the App Store. Check your connection or continue free.');
  }).finally(() => setLoading(false));
  useEffect(() => { void reload(); }, []);

  const unlock = async () => {
    if (operation.current || !prices[PRODUCT_IDS[plan]]) return;
    operation.current = true;
    setBusy(true);
    lightImpactHaptic();
    try {
      const result = await purchasePlan(plan);
      if (result.status === 'purchased' && result.entitlements.productIDs.includes(PRODUCT_IDS[plan])) {
        successHaptic();
        onContinue();
      } else if (result.status === 'pending') {
        Alert.alert('Purchase pending', 'Apple is waiting for approval. Full access will appear automatically when the purchase completes.');
      } else if (result.status === 'purchased') {
        Alert.alert('Checking your purchase', 'Please use Restore purchases to refresh your Apple purchases.');
      }
    } catch (cause) {
      Alert.alert('Purchase could not be completed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { operation.current = false; setBusy(false); }
  };

  const restore = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      if (await restorePurchases()) { successHaptic(); onContinue(); }
      else Alert.alert('No purchases found', 'No active Emotionary purchase was found for this Apple Account.');
    } catch {
      Alert.alert('Could not restore', 'Check your connection and App Store account, then try again.');
    } finally { operation.current = false; setBusy(false); }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.planets}><Planets /></View>
      <Eyebrow>Full access</Eyebrow>
      <Headline size={48} style={styles.title}>
        Every word,{'\n'}every month.
      </Headline>
      <Body tone="muted" style={styles.subtitle}>
        The full emotional vocabulary dictionary, every widget theme, and future word updates.
      </Body>

      <View style={styles.options} accessibilityRole="radiogroup">
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const option = PLANS[key];
          const price = prices[PRODUCT_IDS[key]] ?? (loading ? '…' : '—');
          return (
            <GroundProvider key={key} ground={plan === key ? 'ink' : 'cream'}>
              <View style={plan === key ? styles.selectedPlan : undefined}>
                <OptionRow
                  role="radio"
                  selected={plan === key}
                  onPress={() => { if (!busy) setPlan(key); }}
                  eyebrow={option.eyebrow}
                  title={option.title}
                  body={option.body}
                  accessibilityLabel={`${option.title}, ${price}. ${option.body}`}
                  aside={<Headline accessibilityRole="text" size={30}>{price}</Headline>}
                />
              </View>
            </GroundProvider>
          );
        })}
      </View>

      {error && <Body size={14} tone="muted" style={styles.notice}>{error}</Body>}
      {!loading && !prices[PRODUCT_IDS[plan]] && <Button label="Try again" variant="link" disabled={busy} onPress={() => { setLoading(true); setError(null); void reload(); }} />}
      <Body size={13} tone="muted" style={styles.notice}>
        {plan === 'yearly'
          ? `Full access for one year${prices[PRODUCT_IDS.yearly] ? ` at ${prices[PRODUCT_IDS.yearly]}/year` : ''}. Payment is charged to your Apple Account at confirmation. Renews automatically unless canceled at least 24 hours before the period ends. Manage or cancel in App Store subscriptions.`
          : 'One payment for lifetime full access. Payment is charged to your Apple Account at confirmation.'}
      </Body>
      <View style={styles.links}>
        <Button label="Restore purchases" variant="link" disabled={busy} onPress={() => void restore()} />
        <Button label="Privacy" variant="link" onPress={() => void Linking.openURL('https://emotionarybook.com/privacy')} />
        <Button label="Terms" variant="link" onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} />
      </View>
      <View style={styles.actions}>
        <Button label="Continue free" variant="link" disabled={busy} onPress={onContinueFree} />
        <RoundCta
          label={busy ? 'Working…' : plan === 'yearly' ? 'Subscribe' : 'Buy lifetime'}
          disabled={busy || loading || !prices[PRODUCT_IDS[plan]]}
          onPress={() => void unlock()}
          size={120}
          accessibilityHint={`Unlocks ${plan} full access`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 440 },
  planets: { alignItems: 'flex-end', marginBottom: space.l },
  selectedPlan: { backgroundColor: brand.ink },
  title: { marginTop: space.s },
  subtitle: { marginTop: space.m, maxWidth: 320 },
  options: { gap: space.s, marginTop: space.xl },
  notice: { marginTop: space.m, lineHeight: 19 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: space.s },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
  },
});
