import { toISO } from './dates';
import { effectiveExpense } from './split';
import type { Transaction } from './types';

export interface DayTotals {
  /** Every entry on the day: expenses, income, transfers and settle ups. */
  count: number;
  /** What you spent that day. Only your share of split bills. */
  spent: number;
  income: number;
}

/** Totals per day for one month. `yearMonth` looks like "2026-11". Days with no entries are absent. */
export function dayTotals(transactions: Transaction[], yearMonth: string): Record<string, DayTotals> {
  const out: Record<string, DayTotals> = {};
  for (const t of transactions) {
    if (!t.date.startsWith(yearMonth)) continue;
    const day = (out[t.date] ??= { count: 0, spent: 0, income: 0 });
    day.count += 1;
    if (t.type === 'expense') day.spent += effectiveExpense(t);
    else if (t.type === 'income') day.income += t.amount;
  }
  return out;
}

export function monthSummary(totals: Record<string, DayTotals>) {
  let count = 0;
  let spent = 0;
  let income = 0;
  const days = Object.values(totals);
  for (const d of days) {
    count += d.count;
    spent += d.spent;
    income += d.income;
  }
  return { count, spent, income, activeDays: days.length };
}

/**
 * Weeks of a month as ISO dates, with `null` padding before the 1st and after the last day.
 * `weekStart` 0 = Sunday, 1 = Monday.
 */
export function monthGrid(year: number, month0: number, weekStart: 0 | 1 = 0): (string | null)[][] {
  const first = new Date(year, month0, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month0, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(year: number, month0: number, delta: number) {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

export const yearMonthOf = (year: number, month0: number) => `${year}-${String(month0 + 1).padStart(2, '0')}`;
