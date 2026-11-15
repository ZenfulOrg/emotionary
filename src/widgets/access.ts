/** What the widget needs to know to hide a paid word's meaning on the free plan. */
export interface WidgetAccess {
  hasFullAccess: boolean;
  kept: readonly string[];
}

/** Shown in place of the definition when today's word is paid and the user is free. */
export const LOCKED_WIDGET_LINE = 'Tap to unlock its meaning.';
