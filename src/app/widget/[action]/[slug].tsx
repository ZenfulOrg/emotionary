import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useContentStore } from '@/content/store';
import { successHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';

/** Apply widget actions after root hydration, before navigating away. */
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
    if (action === 'like' || action === 'unlike') {
      const store = useUserStore.getState();
      if (action === 'like') store.addFavorite(slug);
      else store.removeFavorite(slug);
      successHaptic();
    }
    router.replace(`/word/${slug}`);
  }, [action, slug]);

  return null;
}
