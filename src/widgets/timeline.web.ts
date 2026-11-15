import type { Word } from '@/content/types';
import type { WidgetAccess } from '@/widgets/access';

/**
 * Web variant: widgets are iOS-only, and the widget module pulls
 * @expo/ui/swift-ui native views that cannot load on web. This platform
 * split keeps them out of the web bundle entirely.
 */
export function refreshDailyWordWidget(
  _words: readonly Word[],
  _favorites: readonly string[] = [],
  _access?: WidgetAccess,
): void {
  // no-op off iOS
}
