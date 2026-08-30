import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemIcon } from '@/components/system-icon';
import { color, font, space, type } from '@/theme/tokens';

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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={close}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.brand}>EMOTIONARY</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.effective}>Effective {effectiveDate}</Text>
        <Text style={styles.intro}>{intro}</Text>

        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
            ))}
            {section.link && (
              <Pressable
                onPress={() => void Linking.openURL(section.link!.url)}
                accessibilityRole="link"
              >
                <Text style={styles.link}>{section.link.label}</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Text style={styles.footer}>Questions? hello@emotionarybook.com</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: font.serifSemiBold, fontSize: 11, letterSpacing: 2, color: color.inkMuted },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: space.l, paddingBottom: 64 },
  title: { fontFamily: font.display, fontSize: 38, lineHeight: 44, color: color.ink, marginTop: space.m },
  effective: { fontFamily: font.serif, fontSize: type.caption, color: color.inkFaint, marginTop: 6 },
  intro: { fontFamily: font.serif, fontSize: type.body, lineHeight: 26, color: color.ink, marginTop: space.l },
  section: { marginTop: space.l },
  heading: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.ink, marginBottom: 7 },
  paragraph: { fontFamily: font.serif, fontSize: type.small, lineHeight: 23, color: color.inkMuted, marginBottom: 10 },
  link: { fontFamily: font.serifMedium, fontSize: type.small, color: color.ink, textDecorationLine: 'underline' },
  footer: { fontFamily: font.serif, fontSize: type.small, color: color.inkFaint, marginTop: 40 },
});
