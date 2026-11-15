import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Body, Button, Eyebrow, Headline, Mono } from '@/components/brand';
import { usePlanPurchase } from '@/components/Paywall';
import { selectionHaptic } from '@/feedback/haptics';
import { PRODUCT_IDS, restorePurchases, type Plan } from '@/purchases/client';
import { GroundProvider, useGround } from '@/theme/ground';
import { brand, space } from '@/theme/tokens';

/**
 * The short unlock sheet: one headline, one line, two plans side by side and
 * one button. Fits on screen without scrolling. Never states a word count,
 * since the dictionary keeps growing.
 */
export function UnlockSheet({
  onPurchased,
  onNotNow,
}: {
  onPurchased: () => void;
  onNotNow: () => void;
}) {
  const { plan, setPlan, prices, trialDays, yearlyTrial, store, loading, busy, error, reload, unlock } =
    usePlanPurchase(onPurchased);
  const [restoring, setRestoring] = useState(false);
  const price = (key: Plan) => prices[PRODUCT_IDS[key]] ?? (loading ? '…' : '—');
  const ready = !loading && Boolean(prices[PRODUCT_IDS[plan]]);

  const restore = async () => {
    if (restoring || busy) return;
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) onPurchased();
      else Alert.alert('No purchases found', 'This store account has no Emotionary purchase to restore.');
    } catch {
      Alert.alert('Could not restore', 'Check your connection and store account, then try again.');
    } finally {
      setRestoring(false);
    }
  };

  const cta = busy
    ? 'Working…'
    : plan === 'yearly'
      ? yearlyTrial ? 'Start free trial' : 'Subscribe yearly'
      : 'Get lifetime access';

  return (
    <View style={styles.wrap}>
      <Headline size={34} align="center">
        Don&apos;t miss a single day.
      </Headline>
      <Body tone="muted" align="center" style={styles.subtitle}>
        Read today&apos;s meaning, and every word that comes after it.
      </Body>

      <View style={styles.plans} accessibilityRole="radiogroup">
        <PlanCard
          selected={plan === 'yearly'}
          onPress={() => { if (!busy) setPlan('yearly'); }}
          label="Yearly"
          price={price('yearly')}
          note={yearlyTrial ? `${trialDays} days free` : 'per year'}
        />
        <PlanCard
          selected={plan === 'lifetime'}
          onPress={() => { if (!busy) setPlan('lifetime'); }}
          label="Lifetime"
          badge="Best value"
          price={price('lifetime')}
          note="Pay once"
        />
      </View>

      {plan === 'yearly' && ready && (
        <Mono size={11} align="center" style={styles.terms}>
          {yearlyTrial
            ? `Free for ${trialDays} days, then ${price('yearly')}/year. Renews yearly; cancel anytime in ${store}.`
            : `${price('yearly')}/year. Renews yearly; cancel anytime in ${store}.`}
        </Mono>
      )}
      {error && <Body size={15} tone="muted" align="center" style={styles.terms}>{error}</Body>}

      <Button
        label={cta}
        busy={busy}
        disabled={!ready}
        onPress={() => void unlock()}
        style={styles.cta}
        accessibilityHint={`Unlocks ${plan} full access`}
      />
      {!loading && !prices[PRODUCT_IDS[plan]] && (
        <Button label="Try again" variant="link" disabled={busy} onPress={reload} />
      )}

      <View style={styles.links}>
        <Button label="Not now" variant="link" disabled={busy} onPress={onNotNow} />
        <Button
          label={restoring ? 'Restoring…' : 'Restore purchases'}
          variant="link"
          disabled={busy || restoring}
          onPress={() => void restore()}
        />
      </View>
    </View>
  );
}

function PlanCard({
  selected,
  onPress,
  label,
  badge,
  price,
  note,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  badge?: string;
  price: string;
  note: string;
}) {
  return (
    <GroundProvider ground={selected ? 'ink' : 'cream'}>
      <PlanCardBody selected={selected} onPress={onPress} label={label} badge={badge} price={price} note={note} />
    </GroundProvider>
  );
}

function PlanCardBody({
  selected,
  onPress,
  label,
  badge,
  price,
  note,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  badge?: string;
  price: string;
  note: string;
}) {
  const ground = useGround();
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}, ${price}. ${note}`}
      style={({ pressed }) => [
        styles.card,
        { borderColor: selected ? brand.ink : ground.hairline },
        selected && { backgroundColor: brand.ink },
        pressed && !selected && { backgroundColor: ground.wash },
      ]}
    >
      <Eyebrow>{badge ?? ' '}</Eyebrow>
      <Mono size={13} tone="default">{label}</Mono>
      <Headline size={30} style={styles.price}>{price}</Headline>
      <Mono size={12}>{note}</Mono>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  subtitle: { marginTop: space.s },
  plans: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  card: { flex: 1, borderWidth: 1, paddingHorizontal: space.m, paddingVertical: space.m, gap: 2 },
  price: { marginTop: space.xs },
  terms: { marginTop: space.m },
  cta: { marginTop: space.l },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.m },
});
