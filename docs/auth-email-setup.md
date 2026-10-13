# Emotionary email authentication setup

Decision, September 24, 2026: retain email/password sign-in and confirm new accounts with a code entered inside the app. Apple and Google sign-in remain available. Email signup no longer depends on opening a magic link.

## Findings

- The production Supabase project is `zqrdwqvkofhxfxkondmx` (Emotionary). Its public Auth settings confirm email signup is enabled and email confirmation is required. Apple and Google providers are enabled.
- The app already registers `emotionary://` in both Expo config and the native iOS Info.plist, and requests `emotionary://auth-callback` as its confirmation/OAuth redirect.
- The old onboarding advanced after a successful signup request even when no session existed. There was no verification-code field or resend action. The callback screen displayed a success heading even after a failed link.
- The previous local Auth config disabled email confirmation, masking the production flow in local development.
- Read-only Auth logs for the preceding 24 hours showed four successful `/signup` requests and one `over_email_send_rate_limit` response with a 56-second retry delay. Successful signup responses alone do not establish confirmed accounts or working delivery.
- Only implicit token-returning links were implemented. PKCE code exchange and universal links are not implemented. The selected code-confirmation flow does not need either. Legacy callback tokens are now checked against Supabase before being persisted; invalid/expired/recovery links show an error rather than success.
- The user reports messages arriving from Supabase Auth. Dashboard access to Zenfulnote (`iufbilnnxjcppacozecm`) is now confirmed. Hosted custom SMTP was disabled, and the dashboard explicitly locks email-template editing until custom SMTP is set up.

## Local changes prepared

- Signup stays on a verification screen until `POST /auth/v1/verify` returns a session; the request uses `email`, `token`, and `type: email`.
- Password sign-in for an unconfirmed account returns to code verification.
- Resend uses the signup confirmation endpoint with a 60-second local cooldown. Duplicate submit taps are guarded. Wrong/expired codes retain the verification screen.
- The new confirmation email uses `{{ .Token }}` with Emotionary branding. It does not contain a magic link or promise account syncing; saved words and progress remain local.
- Local confirmation is enabled, with an eight-digit code, 10-minute expiration, 60-second send interval, and minimum password length of eight. Hosted settings are tracked separately below.

## Branded sending: recommended setup

Use Resend SMTP with a dedicated sending subdomain: `auth.emotionarybook.com`. Proposed sender: `Emotionary <accounts@auth.emotionarybook.com>`.

This uses the existing domain; it does not require purchasing another domain, moving the website, or setting up a Supabase custom API domain.

### Resend domain created September 24, 2026

The business-owned Resend account has added `auth.emotionarybook.com` in North Virginia (`us-east-1`), domain ID `99afc167-2b79-41d5-9efe-41df30b033e4`. The three records below were saved in Namecheap, checked against the authoritative nameservers, and Resend confirmed the domain **Verified — ready to send emails** at 10:59 AM on September 24. Existing website, Google MX/SPF, domain verification, and Google DKIM records were preserved.

| Type | Namecheap Host | Value | TTL |
| --- | --- | --- | --- |
| TXT | resend._domainkey.auth | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDcBaZxNa+l+0nrL66tV1XTNt16QGEppYcCr+NyfYNg0SrQiHZxCHSE8GKknoTynd289OvnHaD4/QnnfcxTfhi2xgkExRk/bAmcLKacH4rbCgyUQHOHP800rNxnKCZjSX3398j9okiL8JlwI6icMwFHPC8qg7t+2ajJg1G7uUbRswIDAQAB` | Automatic |
| CNAME | rsend.auth | `rsend.forge.rmta.net` | Automatic |
| CNAME | send.auth | `send.forge.rmta.net` | Automatic |

Resend also offers optional DMARC setup; no DMARC policy was added. Sending is enabled and receiving is disabled. Domain Configuration shows tracking metrics are not configured (the page offers Enable tracking metrics / Configure). No tracking subdomain was configured.

The API-key form is prepared as **Emotionary Supabase Auth**, **Sending access**, restricted to **auth.emotionarybook.com**. No key was created by the agent. The owner created and saved the sending credential directly in Supabase; computer-use rules require user entry and submission of a new authentication credential. Do not paste the key into chat or save it in the repository.

### Remaining setup

1. Create or sign into a Resend account owned by the business. Select the plan and accept its terms as the account owner.
2. Add `auth.emotionarybook.com` as a sending domain. Copy the exact verification records Resend generates into the domain's DNS manager; record names/values must come from Resend, not guesses.
3. Verify SPF/DKIM and configure an appropriate DMARC policy. Preserve existing DNS records and mail service. Current public DNS has `dns1.registrar-servers.com` / `dns2.registrar-servers.com` nameservers and a root SPF record authorizing Google. Do not replace that SPF record with a second conflicting root SPF record or replace mailbox MX records.
4. Leave email open/click tracking disabled for authentication messages. Confirm the domain is verified before changing the sender.
5. Create an appropriately scoped sending credential in the provider and enter it directly into Supabase's SMTP password field. Do not paste it into chat, the repository, the mobile app, or an `EXPO_PUBLIC_*` variable.
6. In the correct Emotionary Supabase project, open Authentication → Email → SMTP Settings and configure:

| Setting | Value |
| --- | --- |
| Sender name | Emotionary |
| Sender email | accounts@auth.emotionarybook.com |
| SMTP host | smtp.resend.com |
| SMTP port | 465 |
| SMTP username | resend |
| SMTP password | Provider credential, entered privately |

## Hosted Supabase settings

The dashboard now confirms email signup and confirmation are enabled. On September 24, the minimum password length was saved as eight and OTP expiration as 600 seconds; the existing eight-digit OTP length was retained. Reopening the provider panel verified the saved values. Apple and Google providers remain enabled.

The owner saved the Resend SMTP credential. A fresh dashboard tab confirmed custom SMTP enabled, the credential stored, host smtp.resend.com, port 465, interval 60, username resend, and sender accounts@auth.emotionarybook.com. The sender display name was corrected from Keila to Emotionary and saved. The branded confirmation subject and code-only HTML template were saved and verified after reloading the dashboard. Editing `supabase/config.toml` alone does not deploy hosted settings.

The hosted Site URL and sole allowed redirect are both exactly `emotionary://auth-callback`; these were already correct and were left unchanged.

| Setting | Target |
| --- | --- |
| Email provider / new email signups | Enabled |
| Confirm email | Enabled |
| Minimum password length | 8 |
| Email code length | 8 (existing hosted setting retained) |
| Email code expiration | 600 seconds |
| Minimum interval between emails | 60 seconds |
| Confirm signup subject | Your Emotionary verification code |
| Confirm signup body | `supabase/templates/confirmation.html` |
| Allowed native redirect | Exact `emotionary://auth-callback` |

Choose the production email rate limit to fit expected traffic and the provider plan. Supabase's built-in mail service is for testing, restricts recipients, and currently documents a two-email-per-hour limit. New Free-tier projects created after June 3, 2026 also require custom SMTP to customize templates; a paid Supabase plan does not remove the need for a production email service.

Keep the exact native redirect allowed for Google OAuth and previously issued confirmation links. Retain any legitimate web/admin redirects already in use; do not replace the whole allowlist blindly. Audit other enabled Auth email templates for appropriate branding and working destinations before exposing their flows. This change does not implement password reset or passwordless login.

Do not activate an OTP-only email template for older deployed app versions that cannot accept codes. Coordinate template activation with the new TestFlight build and, if there are older public clients, retain a tested legacy confirmation-link path during migration. Previously issued links are not rewritten by updating a template.

App Store Connect's iOS History was checked on September 24: it lists only version 1.6.1, ending in Rejected, with no released version shown. The code-capable build is assigned to the IT internal TestFlight group (two testers). Internal testers must update to build 2026092401 before testing the code-only email flow.

## End-to-end acceptance before App Review

Local validation completed: 82 tests in 15 suites passed, including the selected eight-digit verification flow; TypeScript and lint passed before the final test-only update; Expo exported the iOS JavaScript/Hermes bundle successfully. Local TOML parses and matches the hosted code policy. Native build 2026092401 archived successfully and was uploaded through Xcode Organizer at 10:50 AM on September 24. Both app and widget report 1.6.1 (2026092401), iPhoneOS, and the intended bundle identifiers; the archive includes the verification-code UI. App Store Connect shows processing Complete and assignment to internal group IT with two invites; a tester installation is not yet verified. The build remains Ready to Submit for external review. The upload reported missing dSYMs for bundled frameworks (see the release record), without blocking upload. DNS is now configured and verified. Live SMTP and the branded signup-code template are now saved and verified in the dashboard. Real email delivery and physical-device signup still need end-to-end verification.

Use a disposable account separate from the reviewer account, and the newly built TestFlight app:

1. Register a previously unused email address outside the Supabase team. Confirm the From name/domain, subject, and code format in the actual received message.
2. Verify an incorrect code is rejected and onboarding does not advance. Confirm resend is throttled and the latest valid code signs in successfully.
3. Check an expired code, resend, and then successful verification. Confirm only a verified session advances onboarding.
4. Terminate/relaunch, check the account remains signed in, sign out, and sign back in with the password. Confirm an unconfirmed account can recover through Sign in → resend code.
5. Check Google/Apple sign-in still work; check an invalid/expired old link shows an error. If retaining old email links, test both cold and warm app launches from Mail.
6. Delete the disposable account and verify it can no longer sign in. Keep a distinct confirmed account with working password credentials for App Review.
7. Record the corrected physical-device flow and update the App Review response/Notes with actual results and the new build number.

## Sources

- [Supabase email templates and token variables](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [Supabase production SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase email-template change, June 2026](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)
- [Resend SMTP with Supabase](https://resend.com/docs/send-with-supabase-smtp)
- [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction)

### Live delivery check

The user-selected test account already existed but was unconfirmed from the earlier failed signup. Its confirmation email was resent through the Supabase dashboard without changing the account password. Resend recorded the message as Delivered with subject Your Emotionary verification code. This confirms provider delivery, not inbox placement or account verification. Recipient inbox receipt, code verification, and physical-device sign-in remain pending.
