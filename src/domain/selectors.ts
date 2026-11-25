import type { Category, PaymentMethod, Period, Transaction } from './types';
import { inPeriod } from './dates';
import { effectiveExpense } from './split';

export const inRange = (transactions: Transaction[], period: Period) =>
  transactions.filter((t) => inPeriod(t.date, period));

/** Income, expenses and net for the period. Transfers between own accounts are ignored. */
export function summarize(transactions: Transaction[], period: Period) {
  let income = 0;
  let expenses = 0;
  for (const t of inRange(transactions, period)) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += effectiveExpense(t);
  }
  return { income, expenses, net: income - expenses };
}

export interface CategorySpend {
  categoryId: string;
  name: string;
  amount: number;
  count: number;
  /** Share of total spending, 0 to 1. */
  share: number;
}

export function spendByCategory(
  transactions: Transaction[],
  categories: Category[],
  period: Period,
): CategorySpend[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of inRange(transactions, period)) {
    if (t.type !== 'expense' || !t.categoryId) continue;
    const mine = effectiveExpense(t);
    if (mine === 0) continue;
    const entry = totals.get(t.categoryId) ?? { amount: 0, count: 0 };
    entry.amount += mine;
    entry.count += 1;
    totals.set(t.categoryId, entry);
    total += mine;
  }
  return [...totals.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      name: names.get(categoryId) ?? 'Deleted category',
      amount: v.amount,
      count: v.count,
      share: total === 0 ? 0 : v.amount / total,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Need / Want / Saved split of expenses. Saving and Investment categories count as Saved;
 * everything else follows the entry's Need/Want choice, falling back to its category.
 */
export function needWantSaved(transactions: Transaction[], categories: Category[], period: Period) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const result = { need: 0, want: 0, saved: 0 };
  for (const t of inRange(transactions, period)) {
    if (t.type !== 'expense') continue;
    const mine = effectiveExpense(t);
    const category = t.categoryId ? byId.get(t.categoryId) : undefined;
    if (category?.group === 'saved') result.saved += mine;
    else if ((t.needWant ?? category?.group) === 'need') result.need += mine;
    else result.want += mine;
  }
  return result;
}

/** Online / offline / credit-card spending for the Analysis screen. */
export function spendByMethod(transactions: Transaction[], period: Period) {
  const result: Record<PaymentMethod, number> = { online: 0, offline: 0, credit_card: 0 };
  for (const t of inRange(transactions, period)) {
    if (t.type === 'expense' && !(t.split && t.split.payer !== 'me')) {
      result[t.paymentMethod ?? 'online'] += t.amount;
    }
  }
  return result;
}

/** Newest first: by date, then by creation time. */
export const sortNewestFirst = (transactions: Transaction[]) =>
  [...transactions].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );

export const recentTransactions = (transactions: Transaction[], count: number) =>
  sortNewestFirst(transactions).slice(0, count);

/** Categories ordered by how often they are used, so Quick Add can show favourites first. */
export function categoriesByUsage(categories: Category[], transactions: Transaction[]): Category[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === 'expense' && t.categoryId) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  return [...categories].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}
