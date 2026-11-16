import type { Word } from '@/content/types';
import { useContentStore } from '@/content/store';
import { todaysWordFor } from '@/daily/welcome';
import { useUserStore } from '@/store/userStore';

/** Today's word for this user (the welcome word on their first day). */
export function useTodaysWord(localDate: string): Word | null {
  const words = useContentStore((s) => s.words);
  const welcomeDate = useUserStore((s) => s.welcomeDate);
  return todaysWordFor(words, localDate, welcomeDate);
}
