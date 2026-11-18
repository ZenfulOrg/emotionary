import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Screen, ScreenHeader } from '@/components/brand';
import { FitToPage } from '@/components/FitToPage';
import { Paywall } from '@/components/Paywall';
import { layout, space } from '@/theme/tokens';

export default function PaywallScreen() {
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen ground="cream" edges={['top', 'bottom']}>
      <ScreenHeader left={{ glyph: 'close', label: 'Close', onPress: close }} />
      <FitToPage contentStyle={styles.content}>
        <Paywall onContinue={close} onContinueFree={close} />
      </FitToPage>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    paddingBottom: space.xl,
  },
});
