/** What the free plan includes. Pro removes every limit. */
export const FREE_LIMITS = {
  accounts: 5,
  recurring: 5,
  categoryBudgets: 3,
  groups: 2,
} as const;

export type LimitKey = keyof typeof FREE_LIMITS;

export const LIMIT_LABEL: Record<LimitKey, string> = {
  accounts: 'accounts',
  recurring: 'recurring entries',
  categoryBudgets: 'category budgets',
  groups: 'groups',
};

export const limitFor = (isPro: boolean, key: LimitKey) => (isPro ? Infinity : FREE_LIMITS[key]);

/** True when adding one more would go over the plan's limit. */
export const atLimit = (isPro: boolean, key: LimitKey, currentCount: number) =>
  currentCount >= limitFor(isPro, key);
