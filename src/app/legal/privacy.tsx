import { LegalDocument } from '@/components/legal-document';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate="November 23, 2026"
      intro="Emotionary is designed as a quiet, private daily ritual. This policy explains the limited information the app handles and the choices available to you."
      sections={[
        {
          heading: 'Information we collect',
          paragraphs: [
            'If you create an account, we process your name when supplied by your sign-in provider, your email address, and the account identifier supplied by Apple, Google, or email sign-in. Our authentication provider may also process routine technical information, such as IP address and device or browser details, to operate and protect sign-in.',
            'Your favorite words, progress, and app preferences are stored on your device. To send your daily word and reminders, we also store a notification token for your device with your reminder times, time zone, streak, plan, and the words you keep, so the right notification arrives at the right time.',
            'To understand how Emotionary is used and improve it, the app sends usage information to our own database: for example, that the app was opened, a word was viewed, saved, or shared, a notification or widget was tapped, a streak was reached, or the paywall was shown. It also sends a short daily status (app version, free or paid plan, whether notifications are on, and how many widgets are installed). This information uses a random identifier created on your device, is not linked to your name or email, never includes what you type, and is not used for advertising or for tracking you across other apps or websites. Emotionary does not use advertising or third-party analytics, and we do not sell or share personal information.',
          ],
        },
        {
          heading: 'How information is used',
          paragraphs: [
            'Account information is used to create, secure, and manage your Emotionary account, and to send you occasional emails about Emotionary, such as new words, features, and offers. Local app data is used to provide favorites, progress, reminders, and your daily-word experience.',
            'You can stop marketing emails at any time with the unsubscribe link in any email or the Marketing emails switch in Settings. We will still send messages needed to operate your account, such as sign-in codes. We do not sell or share your email address for others to market to you.',
            'When you choose to download a word card, the app requests write-only photo-library access to save that image. Notifications are sent from our server through Apple Push Notification service after you grant permission. You can change either permission in iOS Settings.',
          ],
        },
        {
          heading: 'Service providers and sharing',
          paragraphs: [
            'Emotionary uses Supabase to provide authentication, deliver word content, send notifications, and store the usage information described above. RevenueCat verifies purchases and manages access; it receives your purchase records from the App Store and a few usage details (such as your streak, whether notifications are on, and how many words you have saved). Notifications are delivered through Apple Push Notification service. We do not sell personal information. We disclose information only to service providers needed to operate the app, when you direct us to, or when required by law.',
          ],
          link: { label: 'Read Supabase’s privacy policy', url: 'https://supabase.com/privacy' },
        },
        {
          heading: 'Apple purchases',
          paragraphs: [
            'Apple processes payments and manages subscriptions under its own privacy policy. Emotionary uses RevenueCat to verify your purchase and enable full access. We do not receive your payment card details.',
          ],
          link: { label: 'Apple privacy policy', url: 'https://www.apple.com/legal/privacy/' },
        },
        {
          heading: 'Retention and deletion',
          paragraphs: [
            'Account information is retained while your account remains active. You can permanently delete your account at any time in Emotionary under Settings → Delete account. Deleting the account removes the authentication record from our service. If you used Sign in with Apple, the app links to Apple’s instructions to manually revoke access after deletion. Local favorites and progress remain on that device unless you delete the app or clear its data. Usage information is not linked to your account. Cancelling a subscription is done in your store account settings.',
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
            'Emotionary is operated by NowDrops LLC. For privacy questions, requests to access or delete your information, or deletion help, email support@emotionarybook.com.',
          ],
        },
      ]}
    />
  );
}
