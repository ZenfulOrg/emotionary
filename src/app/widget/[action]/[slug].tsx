import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useContentStore } from '@/content/store';
import { useUserStore } from '@/store/userStore';

/** Apply widget actions after root hydration, then open Today on the word. */
export default function WidgetActionScreen() {
  const { action, slug } = useLocalSearchParams<{ action: string; slug: string }>();

  useEffect(() => {
    if (!slug || !useContentStore.getState().words.some((word) => word.slug === slug)) {
      router.replace('/');
      return;
    }
    if (action === 'share') {
      router.replace(`/share/${slug}`);
      return;
    }
    // Explicit save/remove actions stay idempotent if iOS re-delivers a URL.
    const store = useUserStore.getState();
    if (action === 'like') store.addFavorite(slug);
    else if (action === 'unlike') store.removeFavorite(slug);
    // Every other widget tap ('open', the word itself) lands on Today, on this
    // word, with the celebration (confetti, haptic, streak, scroll cue).
    store.celebrate(slug);
    // Back to the Today already open underneath, not a second copy on top.
    if (router.canDismiss()) router.dismissTo('/');
    else router.replace('/');
  }, [action, slug]);

  return null;
}
