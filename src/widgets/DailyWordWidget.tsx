import { HStack, Image, Link, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  containerRelativeFrame,
  font,
  foregroundStyle,
  lineLimit,
  multilineTextAlignment,
  padding,
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

const DailyWordWidgetView = (
  props: DailyWordWidgetProps,
  environment: WidgetEnvironment,
) => {
  'widget';

  const isInline = environment.widgetFamily === 'accessoryInline';
  const isCircular = environment.widgetFamily === 'accessoryCircular';
  const isLockScreen =
    isInline || isCircular || environment.widgetFamily === 'accessoryRectangular';

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
    <Link destination={`emotionary://word/${props.slug}`}>
      <VStack
        alignment="center"
        spacing={isLockScreen ? 3 : 6}
        modifiers={[
          containerRelativeFrame({ axes: 'both' }),
          background(isLockScreen ? '#F7F3EB' : props.tint),
          padding({ all: isLockScreen ? 7 : 13 }),
        ]}
      >
        <Text
          modifiers={[
            font({ design: 'serif', size: isLockScreen ? 17 : 25, weight: 'semibold' }),
            foregroundStyle(props.ink),
            lineLimit(1),
          ]}
        >
          {props.word}
        </Text>
        <Text
          modifiers={[
            font({ design: 'serif', size: isLockScreen ? 8 : 10 }),
            foregroundStyle(props.ink),
            lineLimit(1),
          ]}
        >
          [{props.pronunciation}]
        </Text>
        {!isLockScreen && (
          <Text
            modifiers={[
              font({ design: 'serif', size: 11 }),
              foregroundStyle(props.ink),
              multilineTextAlignment('center'),
              lineLimit(3),
            ]}
          >
            {props.definition}
          </Text>
        )}
        {!isLockScreen && (
          <HStack spacing={30} modifiers={[padding({ top: 2 })]}>
            <Link destination={`emotionary://widget/like/${props.slug}`}>
              <Image
                systemName={props.liked ? 'heart.fill' : 'heart'}
                size={13}
                color={props.ink}
              />
            </Link>
            <Link destination={`emotionary://widget/share/${props.slug}`}>
              <Image systemName="square.and.arrow.up" size={13} color={props.ink} />
            </Link>
          </HStack>
        )}
      </VStack>
    </Link>
  );
};

export default createWidget<DailyWordWidgetProps>('DailyWord', DailyWordWidgetView);
