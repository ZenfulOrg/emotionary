import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { OrbitBackdrop, Screen, ScreenHeader } from '@/components/brand';
import { Paywall } from '@/components/Paywall';
import { layout, space } from '@/theme/tokens';

export default function PaywallScreen() {
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen ground="ink" edges={['top', 'bottom']}>
      <OrbitBackdrop top={-40} />
      <ScreenHeader left={{ glyph: 'close', label: 'Close', onPress: close }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Paywall onContinue={close} onContinueFree={close} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.xl,
  },
});
