import { Share } from 'react-native';

/** The page that sends friends to the right store for their phone. */
const APP_PAGE = 'https://emotionarybook.com/app';

/** Where a link was shared from, so the site can count visits from each. */
export type InviteRef = 'invite' | 'card';

export function inviteUrl(ref: InviteRef): string {
  return `${APP_PAGE}?ref=${ref}`;
}

export const INVITE_MESSAGE =
  'I’ve been learning a new word for a feeling every day with Emotionary. I think you’d love it:';

/** The line under a shared word card. */
export const CARD_SHARE_MESSAGE = `${INVITE_MESSAGE} ${inviteUrl('card')}`;

/** Opens the system share sheet with the invite. Resolves true if it was shared. */
export async function shareInvite(): Promise<boolean> {
  const url = inviteUrl('invite');
  try {
    const result = await Share.share({ message: `${INVITE_MESSAGE} ${url}`, url });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
