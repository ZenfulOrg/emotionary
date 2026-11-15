import { useMemo } from 'react';

import { useUserStore } from '@/store/userStore';

/** The words this free user keeps (read or saved while free), as a Set. */
export function useKeptSlugs(): ReadonlySet<string> {
  const kept = useUserStore((s) => s.keptSlugs);
  return useMemo(() => new Set(kept), [kept]);
}
