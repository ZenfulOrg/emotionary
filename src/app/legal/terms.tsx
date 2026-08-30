import { LegalDocument } from '@/components/legal-document';

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Use"
      effectiveDate="August 30, 2026"
      intro="These terms govern your use of the Emotionary app and its word, definition, and reflection content. By creating an account or using the app, you agree to these terms."
      sections={[
        {
          heading: 'Using Emotionary',
          paragraphs: [
            'You may use Emotionary for personal, non-commercial purposes. You are responsible for keeping your account credentials secure and for information you choose to share from the app.',
            'Do not misuse the service, attempt to access another person’s account, interfere with operation of the app, extract the content in bulk, or use Emotionary in violation of applicable law.',
          ],
        },
        {
          heading: 'Content and intellectual property',
          paragraphs: [
            'Emotionary’s app design, original definitions, writing, illustrations, and branding are owned by Emotionary or its licensors. Sharing tools give you permission to post the generated word cards for personal use; they do not transfer ownership of the underlying content.',
          ],
        },
        {
          heading: 'Accounts and deletion',
          paragraphs: [
            'You may stop using Emotionary at any time. If you created an account, you can permanently delete it from Settings. We may suspend access where reasonably necessary to protect the service, other users, or legal rights.',
          ],
        },
        {
          heading: 'Wellness notice',
          paragraphs: [
            'Emotionary is an educational and reflective tool. It is not medical advice, diagnosis, therapy, or emergency support. Seek a qualified professional for health concerns and contact local emergency services when immediate help is needed.',
          ],
        },
        {
          heading: 'Availability and liability',
          paragraphs: [
            'The app is provided as available. Features and beta behavior may change as Emotionary improves. To the extent permitted by law, Emotionary is not liable for indirect, incidental, or consequential loss arising from use of the app.',
          ],
        },
        {
          heading: 'App Store terms',
          paragraphs: [
            'When downloaded through Apple’s App Store, Apple’s standard end-user license agreement also applies. If these terms conflict with mandatory consumer protections, those protections control.',
          ],
          link: {
            label: 'Apple Standard Licensed Application End User License Agreement',
            url: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
          },
        },
        {
          heading: 'Contact',
          paragraphs: ['Questions about these terms can be sent to hello@emotionarybook.com.'],
        },
      ]}
    />
  );
}
