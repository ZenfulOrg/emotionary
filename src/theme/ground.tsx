import { createContext, useContext, type ReactNode } from 'react';

import { grounds, type Ground, type GroundName } from '@/theme/tokens';

const GroundContext = createContext<Ground>(grounds.cream);

/** Every brand primitive reads its colors from the ground it sits on. */
export function GroundProvider({ ground, children }: { ground: GroundName; children: ReactNode }) {
  return <GroundContext.Provider value={grounds[ground]}>{children}</GroundContext.Provider>;
}

export function useGround(): Ground {
  return useContext(GroundContext);
}
