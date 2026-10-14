import { HStack, Image, Link, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  aspectRatio,
  background,
  clipped,
  containerRelativeFrame,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type DailyWordWidgetProps = {
  /** already lowercase, as the brand sets it */
  word: string;
  pronunciation: string;
  /** already lowercase, ending in a period */
  definition: string;
  category: string;
  tint: string;
  slug: string;
  liked: boolean;
};

type DailyWordWidgetConfiguration = {
  theme: 'automatic' | 'nightSky' | 'moodyNature' | 'duskyRose';
};

/**
 * The 'widget' function is serialized to a string and evaluated alone in the
 * extension, so it cannot reference module scope: every constant lives inside.
 * Fonts are bundled into the widget extension by plugins/with-widget-assets.
 */
const DailyWordWidgetView = (
  props: DailyWordWidgetProps,
  environment: WidgetEnvironment<DailyWordWidgetConfiguration>,
) => {
  'widget';

  const CREAM = '#F5F0E6';
  const INK = '#18334D';
  const PINK = '#E9828C';
  const VOICE = 'CormorantGaramond-Medium';

  const family = environment.widgetFamily;
  const isInline = family === 'accessoryInline';
  const isCircular = family === 'accessoryCircular';
  const isLockScreen = isInline || isCircular || family === 'accessoryRectangular';
  const isMedium = family === 'systemMedium';
  const theme = isLockScreen ? 'automatic' : (environment.configuration?.theme ?? 'automatic');
  const onDark = theme === 'nightSky' || theme === 'moodyNature';
  const text = onDark ? CREAM : INK;
  const muted = onDark ? 'rgba(245, 240, 230, 0.72)' : 'rgba(24, 51, 77, 0.78)';
  const fill =
    theme === 'nightSky'
      ? INK
      : theme === 'moodyNature'
        ? 'rgba(24, 51, 77, 0.52)'
        : theme === 'duskyRose'
          ? PINK
          : props.tint;

  if (isInline) {
    return <Text>{props.word} · {props.definition}</Text>;
  }

  if (isCircular) {
    return (
      <VStack alignment="center" spacing={0} modifiers={[widgetURL(`emotionary://word/${props.slug}`)]}>
        <Text modifiers={[font({ family: VOICE, size: 15 }), lineLimit(1), minimumScaleFactor(0.5)]}>{props.word}</Text>
        <Text modifiers={[font({ design: 'serif', size: 9 }), lineLimit(2)]}>{props.definition}</Text>
      </VStack>
    );
  }

  if (isLockScreen) {
    return (
      <Link destination={`emotionary://word/${props.slug}`}>
        <VStack alignment="leading" spacing={1} modifiers={[frame({ maxWidth: 400, alignment: 'leading' })]}>
          <Text modifiers={[font({ family: VOICE, size: 22 }), lineLimit(1)]}>{props.word}</Text>
          <Text modifiers={[font({ design: 'serif', size: 11 }), lineLimit(1)]}>{props.definition}</Text>
        </VStack>
      </Link>
    );
  }

  return (
    <ZStack modifiers={[containerRelativeFrame({ axes: 'both' }), clipped()]}>
      {theme === 'moodyNature' && (
        <Image
          assetName="MoodyNature"
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: 'fill' }),
            containerRelativeFrame({ axes: 'both' }),
            clipped(),
          ]}
        />
      )}
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[
          padding({ all: isMedium ? 18 : 14 }),
          containerRelativeFrame({ axes: 'both' }),
          background(fill),
        ]}
      >
        <Link destination={`emotionary://word/${props.slug}`}>
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[
              font({ family: VOICE, size: isMedium ? 34 : 28 }),
              foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.5),
            ]}>
              {`${props.word}.`}
            </Text>
            <Text modifiers={[
              font({ design: 'serif', size: 12 }), foregroundStyle(muted),
              multilineTextAlignment('leading'), lineLimit(3), minimumScaleFactor(0.85),
            ]}>
              {props.definition}
            </Text>
          </VStack>
        </Link>
        <Spacer minLength={0} />
        <HStack spacing={16}>
          <Link destination={`emotionary://widget/${props.liked ? 'unlike' : 'like'}/${props.slug}`}
            modifiers={[accessibilityLabel(props.liked ? 'Remove saved word' : 'Save word')]}>
            <Image systemName={props.liked ? 'heart.fill' : 'heart'} size={17} color={text}
              modifiers={[frame({ width: 44, height: 32 })]} />
          </Link>
          <Link destination={`emotionary://widget/share/${props.slug}`}
            modifiers={[accessibilityLabel('Share word')]}>
            <Image systemName="square.and.arrow.up" size={17} color={text}
              modifiers={[frame({ width: 44, height: 32 })]} />
          </Link>
        </HStack>
      </VStack>
    </ZStack>
  );
};

export default createWidget<DailyWordWidgetProps, DailyWordWidgetConfiguration>(
  'DailyWord',
  DailyWordWidgetView,
);
