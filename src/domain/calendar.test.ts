import { describe, expect, it } from 'vitest';

import { dayTotals, monthGrid, monthSummary, shiftMonth, yearMonthOf } from './calendar';
import { formatDayLong, monthLabel } from './dates';
import { formatCompactINR } from './money';
import type { Transaction } from './types';

let n = 0;
const txn = (over: Partial<Transaction>): Transaction => ({
  id: `t${++n}`, type: 'expense', amount: 10000, accountId: 'a1', categoryId: 'food',
  date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z', ...over,
});

describe('calendar', () => {
  it('totals each day: counts everything, sums only your spending', () => {
    const totals = dayTotals(
      [
        txn({ date: '2026-11-05', amount: 25000 }),
        txn({ date: '2026-11-05', amount: 90000, split: { payer: 'me', shares: { me: 30000, a: 60000 } } }),
        txn({ date: '2026-11-05', type: 'income', amount: 500000, categoryId: undefined }),
        txn({ date: '2026-11-05', type: 'transfer', amount: 100000, toAccountId: 'a2', categoryId: undefined }),
        txn({ date: '2026-11-05', type: 'settlement', amount: 20000, friendId: 'a', settleDirection: 'received', categoryId: undefined }),
        txn({ date: '2026-11-06', amount: 1000 }),
        txn({ date: '2026-10-31', amount: 99999 }),
      ],
      '2026-11',
    );
    expect(totals['2026-11-05']).toEqual({ count: 5, spent: 55000, income: 500000 });
    expect(totals['2026-11-06']).toEqual({ count: 1, spent: 1000, income: 0 });
    expect(totals['2026-10-31']).toBeUndefined();
    expect(totals['2026-11-07']).toBeUndefined();
    expect(monthSummary(totals)).toEqual({ count: 6, spent: 56000, income: 500000, activeDays: 2 });
  });

  it('lays out the grid with padding, Sunday or Monday first', () => {
    // 1 Nov 2026 is a Sunday; November has 30 days.
    const sun = monthGrid(2026, 10, 0);
    expect(sun[0][0]).toBe('2026-11-01');
    expect(sun.flat().filter(Boolean)).toHaveLength(30);
    expect(sun.every((w) => w.length === 7)).toBe(true);
    const mon = monthGrid(2026, 10, 1);
    expect(mon[0].slice(0, 6).every((c) => c === null)).toBe(true);
    expect(mon[0][6]).toBe('2026-11-01');
    // February 2027 starts on a Monday, 28 days: exactly four weeks starting Monday.
    expect(monthGrid(2027, 1, 1)).toHaveLength(4);
  });

  it('moves between months across year ends', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
    expect(yearMonthOf(2026, 0)).toBe('2026-01');
  });

  it('formats labels', () => {
    expect(monthLabel(2026, 10)).toBe('November 2026');
    expect(formatDayLong('2026-11-26')).toBe('Thu, 26 Nov');
    expect(formatCompactINR(85000)).toBe('₹850');
    expect(formatCompactINR(120000)).toBe('₹1.2k');
    expect(formatCompactINR(1000000)).toBe('₹10k');
    expect(formatCompactINR(450000 * 100)).toBe('₹4.5L');
    expect(formatCompactINR(11000000 * 100)).toBe('₹1.1Cr');
  });
});
