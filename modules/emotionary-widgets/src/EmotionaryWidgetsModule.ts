import { requireOptionalNativeModule } from 'expo';

export default requireOptionalNativeModule<{
  /** Android only: the widget is drawn natively from this JSON timeline. */
  updateTimeline?(json: string): void;
  /** Number of Emotionary widgets placed; -1 if the OS can't say. */
  installedWidgetCount?(): number | Promise<number>;
  /** Android only: share an image (or only text, with an empty fileUri) with a line of text. True if an app was picked. */
  shareImageWithText?(fileUri: string, text: string, title: string): Promise<boolean>;
}>('EmotionaryWidgets');
