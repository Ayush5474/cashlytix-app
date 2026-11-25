import type { Transaction } from './types';

export const ME = 'me';

/** The part of an expense that is really yours: your share of a split bill, or the whole amount. */
export const effectiveExpense = (t: Transaction | Pick<Transaction, 'amount' | 'split'>): number =>
  t.split ? (t.split.shares[ME] ?? 0) : t.amount;

export type SplitMethod = 'equal' | 'exact' | 'percent';

export interface SharesResult {
  shares?: Record<string, number>;
  error?: string;
}

/**
 * Divide `total` paise between `people`.
 * - equal: leftover paise go to the first people so the shares always add up.
 * - exact: `values` are paise per person and must add up to the total.
 * - percent: `values` are percentages per person and must add up to 100.
 */
export function computeShares(
  total: number,
  people: string[],
  method: SplitMethod,
  values: Record<string, number> = {},
): SharesResult {
  if (people.length === 0) return { error: 'Choose at least one person.' };
  if (!Number.isInteger(total) || total <= 0) return { error: 'Enter the bill amount first.' };

  const shares: Record<string, number> = {};
  if (method === 'equal') {
    const base = Math.floor(total / people.length);
    let extra = total - base * people.length;
    for (const p of people) {
      shares[p] = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
    }
    return { shares };
  }

  if (method === 'exact') {
    let sum = 0;
    for (const p of people) {
      const v = Math.round(values[p] ?? 0);
      shares[p] = v;
      sum += v;
    }
    if (sum !== total) return { error: `Amounts add up to ${sum / 100}, but the bill is ${total / 100}.` };
    return { shares };
  }

  const pct = people.reduce((s, p) => s + (values[p] ?? 0), 0);
  if (Math.abs(pct - 100) > 0.01) return { error: `Percentages add up to ${Math.round(pct * 100) / 100}, not 100.` };
  let sum = 0;
  for (const p of people) {
    shares[p] = Math.round((total * (values[p] ?? 0)) / 100);
    sum += shares[p];
  }
  // Fix rounding drift on the person with the biggest share.
  const biggest = [...people].sort((a, b) => shares[b] - shares[a])[0];
  shares[biggest] += total - sum;
  return { shares };
}

/**
 * Net position per friend, in paise. Positive: the friend owes you. Negative: you owe the friend.
 */
export function friendBalances(transactions: Transaction[]): Record<string, number> {
  const bal: Record<string, number> = {};
  const add = (id: string, n: number) => {
    bal[id] = (bal[id] ?? 0) + n;
  };
  for (const t of transactions) {
    if (t.type === 'expense' && t.split) {
      if (t.split.payer === ME) {
        for (const [id, amt] of Object.entries(t.split.shares)) if (id !== ME) add(id, amt);
      } else {
        add(t.split.payer, -(t.split.shares[ME] ?? 0));
      }
    } else if (t.type === 'settlement' && t.friendId) {
      add(t.friendId, t.settleDirection === 'received' ? -t.amount : t.amount);
    }
  }
  return bal;
}

export function splitTotals(balances: Record<string, number>) {
  let owedToMe = 0;
  let iOwe = 0;
  for (const v of Object.values(balances)) {
    if (v > 0) owedToMe += v;
    else iOwe += -v;
  }
  return { owedToMe, iOwe };
}

/** Everything that involves this friend, for their detail screen. */
export function friendActivity(transactions: Transaction[], friendId: string): Transaction[] {
  return transactions
    .filter(
      (t) =>
        (t.type === 'settlement' && t.friendId === friendId) ||
        (t.type === 'expense' && t.split && (t.split.payer === friendId || friendId in t.split.shares)),
    )
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

/** Total bills and per-member balance for one group. */
export function groupSummary(transactions: Transaction[], groupId: string) {
  const inGroup = transactions.filter((t) => t.type === 'expense' && t.split?.groupId === groupId);
  return {
    total: inGroup.reduce((s, t) => s + t.amount, 0),
    count: inGroup.length,
    balances: friendBalances(inGroup),
    transactions: inGroup,
  };
}
