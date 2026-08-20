import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { successHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';

/**
 * Landing route for widget action deep links
 * (emotionary://widget/like/<slug>, emotionary://widget/share/<slug>).
 * Applies the action, then forwards to the right screen.
 */
export default function WidgetActionScreen() {
  const { action, slug } = useLocalSearchParams<{ action: string; slug: string }>();
  const addFavorite = useUserStore((s) => s.addFavorite);

  useEffect(() => {
    if (action === 'like' && slug) {
      addFavorite(slug);
      successHaptic();
    }
  }, [action, slug, addFavorite]);

  if (!slug) return <Redirect href="/" />;
  if (action === 'share') return <Redirect href={`/share/${slug}`} />;
  return <Redirect href={`/word/${slug}`} />;
}
