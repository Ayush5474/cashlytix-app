import { router } from 'expo-router';

import { atLimit, type LimitKey } from '@/domain/plan';
import { useStore } from '@/store/useStore';

/** Free-plan limits. `guard` runs `go` unless the limit is reached, then shows the upgrade sheet. */
export function usePlan() {
  const isPro = useStore((s) => s.settings.pro);
  const guard = (key: LimitKey, currentCount: number, go: () => void) => {
    if (atLimit(isPro, key, currentCount)) router.push({ pathname: '/upgrade', params: { feature: key } });
    else go();
  };
  return { isPro, guard };
}
