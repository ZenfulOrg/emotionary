import { requireOptionalNativeModule } from 'expo';
export default requireOptionalNativeModule<{ updateTimeline(json: string): void }>('EmotionaryWidgets');
