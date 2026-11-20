import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { useUserStore } from '@/store/userStore';

/** Deep-link target of the share-with-a-friend notification: Today, with the invite open. */
export default function InviteRedirect() {
  useEffect(() => {
    useUserStore.getState().requestInvite();
  }, []);
  return <Redirect href="/" />;
}
