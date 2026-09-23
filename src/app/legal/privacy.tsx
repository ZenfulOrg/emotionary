import { LegalDocument } from '@/components/legal-document';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate="September 23, 2026"
      intro="Emotionary is designed as a quiet, private daily ritual. This policy explains the limited information the app handles and the choices available to you."
      sections={[
        {
          heading: 'Information we collect',
          paragraphs: [
            'If you create an account, we process your name when supplied by your sign-in provider, your email address, and the account identifier supplied by Apple, Google, or email sign-in. Our authentication provider may also process routine technical information, such as IP address and device or browser details, to operate and protect sign-in.',
            'Your favorite words, streak, reminder time, app preferences, and reading activity are stored on your device. Emotionary does not currently use advertising, third-party analytics, or cross-app tracking.',
          ],
        },
        {
          heading: 'How information is used',
          paragraphs: [
            'Account information is used only to create, secure, and manage your Emotionary account. Local app data is used to provide favorites, progress, reminders, and your daily-word experience.',
            'When you choose to download a word card, the app requests write-only photo-library access to save that image. Notifications are scheduled on your device after you grant permission. You can change either permission in iOS Settings.',
          ],
        },
        {
          heading: 'Service providers and sharing',
          paragraphs: [
            'Emotionary uses Supabase to provide authentication and deliver published word content. We do not sell personal information. We disclose information only to service providers needed to operate the app, when you direct us to, or when required by law.',
          ],
          link: { label: 'Read Supabase’s privacy policy', url: 'https://supabase.com/privacy' },
        },
        {
          heading: 'Apple purchases',
          paragraphs: [
            'Apple processes payments and manages subscriptions under its own privacy policy. Emotionary uses Apple-verified purchase status on your device to enable full access. We do not receive your payment card details or send your transaction history to our servers.',
          ],
          link: { label: 'Apple privacy policy', url: 'https://www.apple.com/legal/privacy/' },
        },
        {
          heading: 'Retention and deletion',
          paragraphs: [
            'Account information is retained while your account remains active. You can permanently delete your account at any time in Emotionary under Settings → Delete account. Deleting the account removes the authentication record from our service. If you used Sign in with Apple, the app links to Apple’s instructions to manually revoke access after deletion. Local favorites and progress remain on that device unless you delete the app or clear its data.',
          ],
        },
        {
          heading: 'Children and changes',
          paragraphs: [
            'Emotionary is not directed to children under 13, and we do not knowingly collect personal information from them. If this policy changes materially, the effective date above will be updated and the revised policy will be made available in the app.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'For privacy questions or deletion help, email support@emotionarybook.com.',
          ],
        },
      ]}
    />
  );
}
