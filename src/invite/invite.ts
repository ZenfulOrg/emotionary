import { Share } from 'react-native';

/** The page that sends friends to the right store for their phone. */
export const INVITE_URL = 'https://emotionarybook.com/app';

export const INVITE_MESSAGE =
  'I’ve been learning a new word for a feeling every day with Emotionary. I think you’d love it:';

/** Evening after the invite first shows: one gentle nudge, never twice. */
export function inviteNotificationDate(now: Date = new Date()): Date {
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(19, 0, 0, 0);
  return at;
}

/** Opens the system share sheet with the invite. Resolves true if it was shared. */
export async function shareInvite(): Promise<boolean> {
  try {
    const result = await Share.share({ message: `${INVITE_MESSAGE} ${INVITE_URL}`, url: INVITE_URL });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
