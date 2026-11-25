import type { Category, Transaction } from './types';
import { periodFor } from './dates';
import { needWantSaved, spendByCategory } from './selectors';

export type BudgetLevel = 'ok' | 'warn' | 'over';

export const budgetLevel = (ratio: number): BudgetLevel => (ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok');

export interface BudgetLine {
  id: string;
  name: string;
  limit: number;
  spent: number;
  /** spent / limit; can go above 1 when over budget. */
  ratio: number;
  level: BudgetLevel;
}

const line = (id: string, name: string, limit: number, spent: number): BudgetLine => {
  const ratio = limit > 0 ? spent / limit : 0;
  return { id, name, limit, spent, ratio, level: budgetLevel(ratio) };
};

/**
 * This month's budgets. The overall budget counts needs and wants only: money you put into
 * savings or investments is not "spending".
 */
export function monthBudgets(
  transactions: Transaction[],
  categories: Category[],
  monthlyBudget: number | undefined,
  now: Date = new Date(),
) {
  const period = periodFor('this_month', now);
  const nws = needWantSaved(transactions, categories, period);
  const spendByCat = new Map(spendByCategory(transactions, categories, period).map((s) => [s.categoryId, s.amount]));

  return {
    overall: monthlyBudget && monthlyBudget > 0 ? line('overall', 'Monthly budget', monthlyBudget, nws.need + nws.want) : undefined,
    categories: categories
      .filter((c) => c.budget && c.budget > 0)
      .map((c) => line(c.id, c.name, c.budget!, spendByCat.get(c.id) ?? 0)),
  };
}
