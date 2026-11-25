import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from './defaults';
import { addDaysISO, formatDateShort, inPeriod, isValidISO, periodFor } from './dates';
import { accountBalance, totalBalance, validateTransaction } from './ledger';
import { formatINR, formatTypedAmount, parseAmountToPaise, pressKey } from './money';
import {
  categoriesByUsage,
  needWantSaved,
  recentTransactions,
  spendByCategory,
  spendByMethod,
  summarize,
} from './selectors';
import type { Account, Transaction } from './types';

const acct = (over: Partial<Account>): Account => ({
  id: 'a1',
  name: 'Salary',
  type: 'checking',
  openingBalance: 0,
  includeInTotal: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

let n = 0;
const txn = (over: Partial<Transaction>): Transaction => ({
  id: `t${++n}`,
  type: 'expense',
  amount: 10000,
  accountId: 'a1',
  categoryId: 'food',
  date: '2026-11-10',
  createdAt: `2026-11-10T10:00:${String(n).padStart(2, '0')}.000Z`,
  ...over,
});

describe('money', () => {
  it('formats rupees with Indian grouping', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(25000)).toBe('₹250');
    expect(formatINR(123456700)).toBe('₹12,34,567');
    expect(formatINR(13200000)).toBe('₹1,32,000');
    expect(formatINR(-8400 * 100)).toBe('-₹8,400');
    expect(formatINR(25050)).toBe('₹250.50');
    expect(formatINR(500, { sign: true })).toBe('+₹5');
  });

  it('parses typed amounts into paise', () => {
    expect(parseAmountToPaise('250')).toBe(25000);
    expect(parseAmountToPaise('250.5')).toBe(25050);
    expect(parseAmountToPaise('1,250.25')).toBe(125025);
    expect(parseAmountToPaise('')).toBe(0);
    expect(parseAmountToPaise('.')).toBe(0);
    expect(parseAmountToPaise('abc')).toBe(0);
  });

  it('formats the text typed on the number pad', () => {
    expect(formatTypedAmount('')).toBe('0');
    expect(formatTypedAmount('1250')).toBe('1,250');
    expect(formatTypedAmount('1250.')).toBe('1,250.');
    expect(formatTypedAmount('0.5')).toBe('0.5');
  });

  it('applies number pad rules', () => {
    expect(pressKey('', '5')).toBe('5');
    expect(pressKey('0', '5')).toBe('5');
    expect(pressKey('0', '0')).toBe('0');
    expect(pressKey('', '.')).toBe('0.');
    expect(pressKey('12.', '.')).toBe('12.');
    expect(pressKey('12.5', '7')).toBe('12.57');
    expect(pressKey('12.57', '9')).toBe('12.57');
    expect(pressKey('123456789', '1')).toBe('123456789');
    expect(pressKey('12', 'del')).toBe('1');
    expect(pressKey('', 'del')).toBe('');
  });
});

describe('dates', () => {
  const now = new Date(2026, 10, 24); // 24 Nov 2026

  it('builds periods', () => {
    expect(periodFor('this_month', now)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(periodFor('last_month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(periodFor('this_year', now)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodFor('all', now)).toEqual({});
  });

  it('handles January looking back to December', () => {
    expect(periodFor('last_month', new Date(2026, 0, 5))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('checks membership and validity', () => {
    expect(inPeriod('2026-11-30', { from: '2026-11-01', to: '2026-11-30' })).toBe(true);
    expect(inPeriod('2026-12-01', { from: '2026-11-01', to: '2026-11-30' })).toBe(false);
    expect(inPeriod('1999-01-01', {})).toBe(true);
    expect(isValidISO('2026-02-30')).toBe(false);
    expect(isValidISO('2026-11-24')).toBe(true);
    expect(isValidISO('24-11-2026')).toBe(false);
  });

  it('adds days and formats', () => {
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
    expect(formatDateShort('2026-11-24', now)).toBe('24 Nov');
    expect(formatDateShort('2025-03-05', now)).toBe('5 Mar 2025');
  });
});

describe('ledger', () => {
  it('moves balances for expense and income', () => {
    const a = acct({ openingBalance: 1000000 });
    const txns = [txn({ amount: 25000 }), txn({ type: 'income', amount: 8500000, categoryId: undefined })];
    expect(accountBalance(a, txns)).toBe(1000000 - 25000 + 8500000);
  });

  it('treats a credit card as money owed', () => {
    const card = acct({ id: 'cc', type: 'credit_card', openingBalance: 0 });
    const bank = acct({ id: 'a1', openingBalance: 5000000 });
    const spend = txn({ accountId: 'cc', amount: 120000, paymentMethod: 'credit_card' });
    expect(accountBalance(card, [spend])).toBe(120000); // outstanding grows
    const payBill = txn({ type: 'transfer', accountId: 'a1', toAccountId: 'cc', amount: 120000, categoryId: undefined });
    expect(accountBalance(card, [spend, payBill])).toBe(0);
    expect(accountBalance(bank, [spend, payBill])).toBe(5000000 - 120000);
  });

  it('moves money between own accounts with transfers', () => {
    const a = acct({ id: 'a1', openingBalance: 100000 });
    const b = acct({ id: 'b1', openingBalance: 0 });
    const t = txn({ type: 'transfer', accountId: 'a1', toAccountId: 'b1', amount: 30000, categoryId: undefined });
    expect(accountBalance(a, [t])).toBe(70000);
    expect(accountBalance(b, [t])).toBe(30000);
  });

  it('recomputes cleanly when a transaction is removed', () => {
    const a = acct({ openingBalance: 100000 });
    const t = txn({ amount: 40000 });
    expect(accountBalance(a, [t])).toBe(60000);
    expect(accountBalance(a, [])).toBe(100000);
  });

  it('totals only included accounts and subtracts card dues', () => {
    const salary = acct({ id: 'a1', openingBalance: 6200000 });
    const savings = acct({ id: 'a2', type: 'saving', openingBalance: 4000000 });
    const funds = acct({ id: 'a3', type: 'investment', openingBalance: 3000000 });
    const card = acct({ id: 'a4', type: 'credit_card', openingBalance: 840000, includeInTotal: false });
    expect(totalBalance([salary, savings, funds, card], [])).toBe(13200000);
    expect(totalBalance([salary, { ...card, includeInTotal: true }], [])).toBe(6200000 - 840000);
  });

  it('validates new transactions', () => {
    const accounts = [acct({ id: 'a1' }), acct({ id: 'a2' })];
    const base = { type: 'expense', amount: 100, accountId: 'a1', categoryId: 'food', date: '2026-11-10' } as const;
    expect(validateTransaction(base, accounts)).toBeNull();
    expect(validateTransaction({ ...base, amount: 0 }, accounts)).toMatch(/amount/i);
    expect(validateTransaction({ ...base, amount: 10.5 }, accounts)).toMatch(/amount/i);
    expect(validateTransaction({ ...base, accountId: 'zz' }, accounts)).toMatch(/account/i);
    expect(validateTransaction({ ...base, categoryId: undefined }, accounts)).toMatch(/category/i);
    expect(validateTransaction({ ...base, date: '2026-13-01' }, accounts)).toMatch(/date/i);
    expect(validateTransaction({ ...base, type: 'transfer', categoryId: undefined }, accounts)).toMatch(/send to/i);
    expect(
      validateTransaction({ ...base, type: 'transfer', categoryId: undefined, toAccountId: 'a1' }, accounts),
    ).toMatch(/different/i);
    expect(
      validateTransaction({ ...base, type: 'transfer', categoryId: undefined, toAccountId: 'a2' }, accounts),
    ).toBeNull();
    expect(validateTransaction({ ...base, type: 'income', categoryId: undefined }, accounts)).toBeNull();
  });
});

describe('selectors', () => {
  const period = { from: '2026-11-01', to: '2026-11-30' };
  const txns = [
    txn({ type: 'income', amount: 8500000, categoryId: undefined }),
    txn({ amount: 25000, categoryId: 'food' }),
    txn({ amount: 8000, categoryId: 'transport', paymentMethod: 'offline' }),
    txn({ amount: 120000, categoryId: 'shopping', paymentMethod: 'credit_card' }),
    txn({ amount: 500000, categoryId: 'investment' }),
    txn({ amount: 30000, categoryId: 'food', needWant: 'want' }),
    txn({ type: 'transfer', amount: 999999, toAccountId: 'a2', categoryId: undefined }),
    txn({ amount: 77777, categoryId: 'food', date: '2026-10-15' }), // outside period
  ];

  it('summarizes income, expenses and net, ignoring transfers and other months', () => {
    const s = summarize(txns, period);
    expect(s.income).toBe(8500000);
    expect(s.expenses).toBe(25000 + 8000 + 120000 + 500000 + 30000);
    expect(s.net).toBe(s.income - s.expenses);
  });

  it('splits spending by category with shares and counts', () => {
    const rows = spendByCategory(txns, DEFAULT_CATEGORIES, period);
    expect(rows[0].name).toBe('Investment');
    const food = rows.find((r) => r.categoryId === 'food')!;
    expect(food.amount).toBe(55000);
    expect(food.count).toBe(2);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it('computes Need / Want / Saved', () => {
    const r = needWantSaved(txns, DEFAULT_CATEGORIES, period);
    expect(r.saved).toBe(500000); // investment
    expect(r.need).toBe(25000 + 8000); // food + transport
    expect(r.want).toBe(120000 + 30000); // shopping + food marked as want
  });

  it('splits spending by payment method', () => {
    expect(spendByMethod(txns, period)).toEqual({
      online: 25000 + 500000 + 30000,
      offline: 8000,
      credit_card: 120000,
    });
  });

  it('lists recent transactions newest first', () => {
    const recent = recentTransactions(
      [txn({ date: '2026-11-01' }), txn({ date: '2026-11-20' }), txn({ date: '2026-11-05' })],
      2,
    );
    expect(recent.map((t) => t.date)).toEqual(['2026-11-20', '2026-11-05']);
  });

  it('orders categories by how often they are used', () => {
    const ordered = categoriesByUsage(DEFAULT_CATEGORIES, [
      txn({ categoryId: 'shopping' }),
      txn({ categoryId: 'shopping' }),
      txn({ categoryId: 'utilities' }),
    ]);
    expect(ordered.slice(0, 2).map((c) => c.id)).toEqual(['shopping', 'utilities']);
    expect(ordered.length).toBe(DEFAULT_CATEGORIES.length);
  });
});
