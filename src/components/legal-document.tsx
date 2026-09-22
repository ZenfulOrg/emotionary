import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Body, Button, Eyebrow, Headline, Mono, Rule, Screen, ScreenHeader } from '@/components/brand';
import { layout, space, type } from '@/theme/tokens';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  link?: { label: string; url: string };
}

export function LegalDocument({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}) {
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader left={{ glyph: 'back', label: 'Close', onPress: close }} eyebrow="Emotionary" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Eyebrow>Effective {effectiveDate}</Eyebrow>
        <Headline size={44} style={styles.title}>
          {title}
        </Headline>
        <Rule style={styles.rule} />
        <Body size={type.lead}>{intro}</Body>

        {sections.map((section, index) => (
          <View key={section.heading} style={styles.section}>
            <Mono size={11} tone="faint">
              {String(index + 1).padStart(2, '0')}
            </Mono>
            <Headline size={24} style={styles.heading}>
              {section.heading}
            </Headline>
            {section.paragraphs.map((paragraph) => (
              <Body key={paragraph} tone="muted" style={styles.paragraph}>
                {paragraph}
              </Body>
            ))}
            {section.link && (
              <Button
                label={section.link.label}
                variant="link"
                glyph="leaves"
                onPress={() => void Linking.openURL(section.link!.url)}
                style={styles.link}
              />
            )}
          </View>
        ))}
        <Body tone="muted" style={styles.footer}>
          Questions? hello@emotionarybook.com
        </Body>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    paddingBottom: 64,
  },
  title: { marginTop: space.s },
  rule: { marginVertical: space.l },
  section: { marginTop: space.xl },
  heading: { marginTop: space.xs, marginBottom: space.s },
  paragraph: { marginBottom: space.s },
  link: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
  footer: { marginTop: space.xxl },
});
