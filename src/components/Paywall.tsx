import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, OptionRow, Planets, RoundCta } from '@/components/brand';
import { lightImpactHaptic, successHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { GroundProvider } from '@/theme/ground';
import { brand, space } from '@/theme/tokens';

type Plan = 'yearly' | 'lifetime';

const PLANS: Record<Plan, { title: string; price: string; body: string; eyebrow?: string }> = {
  yearly: { title: 'Yearly', price: '$4.99', body: 'Per year — less than a cup of coffee.' },
  lifetime: { title: 'Lifetime', price: '$9.99', body: 'One time, yours to keep.', eyebrow: 'Best value' },
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
  const unlockFullAccess = useUserStore((state) => state.unlockFullAccess);

  const unlock = () => {
    lightImpactHaptic();
    // TestFlight beta entitlement: no App Store charge is initiated.
    unlockFullAccess();
    successHaptic();
    onContinue();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.planets}><Planets /></View>
      <Eyebrow>Full access</Eyebrow>
      <Headline size={48} style={styles.title}>
        Every word,{'\n'}every month.
      </Headline>
      <Body tone="muted" style={styles.subtitle}>
        Thousands of unique words, every widget theme, and new words every month.
      </Body>

      <View style={styles.options} accessibilityRole="radiogroup">
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const option = PLANS[key];
          return (
            <GroundProvider key={key} ground={plan === key ? 'ink' : 'cream'}>
              <View style={plan === key ? styles.selectedPlan : undefined}>
                <OptionRow
                  role="radio"
                  selected={plan === key}
                  onPress={() => setPlan(key)}
                  eyebrow={option.eyebrow}
                  title={option.title}
                  body={option.body}
                  accessibilityLabel={`${option.title}, ${option.price}. ${option.body}`}
                  aside={<Headline accessibilityRole="text" size={30}>{option.price}</Headline>}
                />
              </View>
            </GroundProvider>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button label="Continue free" variant="link" onPress={onContinueFree} />
        <RoundCta
          label="Continue"
          onPress={unlock}
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
  },
});
