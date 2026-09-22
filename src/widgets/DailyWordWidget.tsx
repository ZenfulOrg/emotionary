import { HStack, Image, Link, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  clipped,
  containerRelativeFrame,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  multilineTextAlignment,
  padding,
  resizable,
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

const CREAM = '#F5F0E6';
const INK = '#18334D';
const ACID = '#F5C400';
const PINK = '#E9828C';

/** Fonts are bundled into the widget extension by plugins/with-widget-assets. */
const VOICE = 'CormorantGaramond-Medium';
const WHISPER = 'DMMono-Regular';

const DailyWordWidgetView = (
  props: DailyWordWidgetProps,
  environment: WidgetEnvironment<DailyWordWidgetConfiguration>,
) => {
  'widget';

  const family = environment.widgetFamily;
  const isInline = family === 'accessoryInline';
  const isCircular = family === 'accessoryCircular';
  const isLockScreen = isInline || isCircular || family === 'accessoryRectangular';
  const isMedium = family === 'systemMedium';
  const theme = isLockScreen ? 'automatic' : (environment.configuration?.theme ?? 'automatic');
  const onDark = theme === 'nightSky' || theme === 'moodyNature';
  const text = onDark ? CREAM : INK;
  const muted = onDark ? 'rgba(245, 240, 230, 0.72)' : 'rgba(24, 51, 77, 0.78)';
  const eyebrow = onDark ? ACID : theme === 'duskyRose' ? INK : '#1F6B9E';
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
      <VStack alignment="center" spacing={0}>
        <Text modifiers={[font({ family: VOICE, size: 15 }), lineLimit(1)]}>{props.word}</Text>
        <Text modifiers={[font({ family: WHISPER, size: 7 }), lineLimit(1)]}>TODAY</Text>
      </VStack>
    );
  }

  if (isLockScreen) {
    return (
      <Link destination={`emotionary://word/${props.slug}`}>
        <VStack alignment="leading" spacing={1} modifiers={[frame({ maxWidth: 400, alignment: 'leading' })]}>
          <Text modifiers={[font({ family: WHISPER, size: 9 }), lineLimit(1)]}>
            /{props.pronunciation}/
          </Text>
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
        spacing={4}
        modifiers={[
          containerRelativeFrame({ axes: 'both' }),
          background(fill),
          padding({ all: isMedium ? 20 : 16 }),
        ]}
      >
        <HStack spacing={5}>
          <Text modifiers={[font({ family: WHISPER, size: 8 }), foregroundStyle(eyebrow), lineLimit(1)]}>
            {props.category}
          </Text>
        </HStack>
        <Link destination={`emotionary://word/${props.slug}`}>
          <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 400, maxHeight: 400, alignment: 'bottomLeading' })]}>
            <Text modifiers={[font({ family: WHISPER, size: 8 }), foregroundStyle(muted), lineLimit(1)]}>
              /{props.pronunciation}/
            </Text>
            <HStack spacing={0}>
              <Text modifiers={[font({ family: VOICE, size: isMedium ? 34 : 28 }), foregroundStyle(text), lineLimit(1)]}>
                {props.word}
              </Text>
              <Text modifiers={[font({ family: VOICE, size: isMedium ? 34 : 28 }), foregroundStyle(ACID)]}>.</Text>
            </HStack>
            <Text
              modifiers={[
                font({ design: 'serif', size: 11 }),
                foregroundStyle(muted),
                multilineTextAlignment('leading'),
                lineLimit(isMedium ? 2 : 3),
              ]}
            >
              {props.definition}
            </Text>
          </VStack>
        </Link>
        <HStack spacing={20} modifiers={[padding({ top: 4 })]}>
          <Link destination={`emotionary://widget/like/${props.slug}`}>
            <Image systemName={props.liked ? 'heart.fill' : 'heart'} size={13} color={text} />
          </Link>
          <Link destination={`emotionary://widget/share/${props.slug}`}>
            <Image systemName="arrow.up.right" size={13} color={text} />
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
