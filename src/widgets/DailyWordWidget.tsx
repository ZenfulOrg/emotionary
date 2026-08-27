import { HStack, Image, Link, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  clipped,
  containerRelativeFrame,
  font,
  foregroundStyle,
  lineLimit,
  multilineTextAlignment,
  padding,
  resizable,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type DailyWordWidgetProps = {
  word: string;
  pronunciation: string;
  definition: string;
  tint: string;
  ink: string;
  slug: string;
  liked: boolean;
};

type DailyWordWidgetConfiguration = {
  theme: 'automatic' | 'moodyNature' | 'duskyRose';
};

const DailyWordWidgetView = (
  props: DailyWordWidgetProps,
  environment: WidgetEnvironment<DailyWordWidgetConfiguration>,
) => {
  'widget';

  const isInline = environment.widgetFamily === 'accessoryInline';
  const isCircular = environment.widgetFamily === 'accessoryCircular';
  const isLockScreen =
    isInline || isCircular || environment.widgetFamily === 'accessoryRectangular';
  const theme = environment.configuration?.theme ?? 'automatic';
  const moodyNature = !isLockScreen && theme === 'moodyNature';
  const duskyRose = !isLockScreen && theme === 'duskyRose';
  const widgetInk = moodyNature ? '#FFF8EC' : props.ink;
  const widgetBackground = isLockScreen
    ? '#F7F3EB'
    : moodyNature
      ? 'rgba(11, 19, 19, 0.42)'
      : duskyRose
        ? '#E8C9D4'
        : props.tint;

  if (isInline) {
    return <Text>{props.word} · {props.definition}</Text>;
  }

  if (isCircular) {
    return (
      <VStack alignment="center" spacing={1}>
        <Text modifiers={[font({ design: 'serif', size: 12, weight: 'semibold' }), lineLimit(1)]}>
          {props.word}
        </Text>
        <Text modifiers={[font({ design: 'serif', size: 8 }), lineLimit(1)]}>TODAY</Text>
      </VStack>
    );
  }

  return (
    <ZStack modifiers={[containerRelativeFrame({ axes: 'both' }), clipped()]}>
      {moodyNature && (
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
        alignment="center"
        spacing={isLockScreen ? 3 : 8}
        modifiers={[
          containerRelativeFrame({ axes: 'both' }),
          background(widgetBackground),
          padding({ all: isLockScreen ? 9 : environment.widgetFamily === 'systemMedium' ? 24 : 20 }),
        ]}
      >
        <Link destination={`emotionary://word/${props.slug}`}>
          <VStack alignment="center" spacing={isLockScreen ? 3 : 8}>
            <Text
              modifiers={[
                font({ design: 'serif', size: isLockScreen ? 17 : 24, weight: 'semibold' }),
                foregroundStyle(widgetInk),
                lineLimit(1),
              ]}
            >
              {props.word}
            </Text>
            <Text
              modifiers={[
                font({ design: 'serif', size: isLockScreen ? 8 : 10 }),
                foregroundStyle(widgetInk),
                lineLimit(1),
              ]}
            >
              [{props.pronunciation}]
            </Text>
            {!isLockScreen && (
              <Text
                modifiers={[
                  font({ design: 'serif', size: 10 }),
                  foregroundStyle(widgetInk),
                  multilineTextAlignment('center'),
                  lineLimit(environment.widgetFamily === 'systemMedium' ? 2 : 3),
                ]}
              >
                {props.definition}
              </Text>
            )}
          </VStack>
        </Link>
        {!isLockScreen && (
          <HStack spacing={36} modifiers={[padding({ top: 3 })]}>
            <Link destination={`emotionary://widget/like/${props.slug}`}>
              <Image
                systemName={props.liked ? 'heart.fill' : 'heart'}
                size={15}
                color={widgetInk}
              />
            </Link>
            <Link destination={`emotionary://widget/share/${props.slug}`}>
              <Image systemName="square.and.arrow.up" size={15} color={widgetInk} />
            </Link>
          </HStack>
        )}
      </VStack>
    </ZStack>
  );
};

export default createWidget<DailyWordWidgetProps, DailyWordWidgetConfiguration>(
  'DailyWord',
  DailyWordWidgetView,
);
