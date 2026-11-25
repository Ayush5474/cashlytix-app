import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from './defaults';
import { buildBackup, parseBackup, toCSV } from './exporting';
import { monthBudgets, budgetLevel } from './budgets';
import { accountBalance, validateTransaction } from './ledger';
import { atLimit, FREE_LIMITS, limitFor } from './plan';
import { materialize, nextOccurrence } from './recurring';
import { needWantSaved, spendByCategory, spendByMethod, summarize } from './selectors';
import {
  computeShares,
  effectiveExpense,
  friendActivity,
  friendBalances,
  groupSummary,
  splitTotals,
} from './split';
import type { Account, RecurringRule, Transaction } from './types';

const acct = (over: Partial<Account> = {}): Account => ({
  id: 'a1', name: 'Bank', type: 'checking', openingBalance: 100000, includeInTotal: true,
  createdAt: '2026-11-01T00:00:00.000Z', ...over,
});
let n = 0;
const txn = (over: Partial<Transaction>): Transaction => ({
  id: `t${++n}`, type: 'expense', amount: 10000, accountId: 'a1', categoryId: 'food',
  date: '2026-11-10', createdAt: `2026-11-10T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over,
});
const month = { from: '2026-11-01', to: '2026-11-30' };

describe('computeShares', () => {
  it('splits equally and gives leftover paise to the first people', () => {
    const r = computeShares(10000, ['me', 'a', 'b'], 'equal');
    expect(r.shares).toEqual({ me: 3334, a: 3333, b: 3333 });
    expect(Object.values(r.shares!).reduce((s, v) => s + v, 0)).toBe(10000);
  });
  it('validates exact amounts', () => {
    expect(computeShares(10000, ['me', 'a'], 'exact', { me: 4000, a: 6000 }).shares).toEqual({ me: 4000, a: 6000 });
    expect(computeShares(10000, ['me', 'a'], 'exact', { me: 4000, a: 5000 }).error).toMatch(/add up/);
  });
  it('handles percentages and rounding', () => {
    const r = computeShares(10000, ['me', 'a', 'b'], 'percent', { me: 33.33, a: 33.33, b: 33.34 });
    expect(Object.values(r.shares!).reduce((s, v) => s + v, 0)).toBe(10000);
    expect(computeShares(10000, ['me', 'a'], 'percent', { me: 50, a: 40 }).error).toMatch(/100/);
  });
  it('rejects empty people and zero totals', () => {
    expect(computeShares(10000, [], 'equal').error).toBeDefined();
    expect(computeShares(0, ['me'], 'equal').error).toBeDefined();
  });
});

describe('split accounting', () => {
  // I paid 1000 for dinner with Asha and Ravi, 4 ways would be 250 each; here 3 ways.
  const dinner = txn({
    amount: 90000,
    split: { payer: 'me', shares: { me: 30000, asha: 30000, ravi: 30000 }, groupId: 'g1' },
  });
  // Asha paid 600 for a cab; my share is 200.
  const cab = txn({
    amount: 60000, accountId: '', categoryId: 'transport', paymentMethod: undefined,
    split: { payer: 'asha', shares: { me: 20000, asha: 40000 } },
  });

  it('counts only your share as your expense', () => {
    expect(effectiveExpense(dinner)).toBe(30000);
    expect(effectiveExpense(cab)).toBe(20000);
    expect(effectiveExpense(txn({}))).toBe(10000);
    expect(summarize([dinner, cab], month).expenses).toBe(50000);
    expect(spendByCategory([dinner, cab], DEFAULT_CATEGORIES, month).map((r) => r.amount).sort()).toEqual([20000, 30000]);
    expect(needWantSaved([dinner, cab], DEFAULT_CATEGORIES, month).need).toBe(50000);
  });

  it('takes the full bill from the account only when you paid', () => {
    expect(accountBalance(acct(), [dinner])).toBe(100000 - 90000);
    expect(accountBalance(acct(), [cab])).toBe(100000);
    expect(spendByMethod([dinner, cab], month).online).toBe(90000);
  });

  it('works out who owes whom', () => {
    const bal = friendBalances([dinner, cab]);
    expect(bal.ravi).toBe(30000);
    expect(bal.asha).toBe(30000 - 20000);
    expect(splitTotals(bal)).toEqual({ owedToMe: 40000, iOwe: 0 });
  });

  it('settling up moves money without touching income or expenses', () => {
    const recv = txn({ type: 'settlement', amount: 30000, friendId: 'ravi', settleDirection: 'received', categoryId: undefined });
    const paid = txn({ type: 'settlement', amount: 10000, friendId: 'asha', settleDirection: 'paid', categoryId: undefined });
    const all = [dinner, cab, recv, paid];
    const bal = friendBalances(all);
    expect(bal.ravi).toBe(0);
    expect(bal.asha).toBe(20000);
    expect(accountBalance(acct(), all)).toBe(100000 - 90000 + 30000 - 10000);
    expect(summarize(all, month)).toEqual({ income: 0, expenses: 50000, net: -50000 });
  });

  it('shows what you owe when a friend paid more than your share', () => {
    const bal = friendBalances([cab]);
    expect(bal.asha).toBe(-20000);
    expect(splitTotals(bal)).toEqual({ owedToMe: 0, iOwe: 20000 });
  });

  it('lists activity per friend and per group', () => {
    expect(friendActivity([dinner, cab, txn({})], 'asha')).toHaveLength(2);
    expect(friendActivity([dinner, cab], 'ravi')).toHaveLength(1);
    const g = groupSummary([dinner, cab], 'g1');
    expect(g.total).toBe(90000);
    expect(g.balances.ravi).toBe(30000);
  });

  it('validates split and settlement transactions', () => {
    const a = [acct()];
    const base = { type: 'expense', amount: 90000, accountId: 'a1', categoryId: 'food', date: '2026-11-10' } as const;
    expect(validateTransaction({ ...base, split: dinner.split }, a)).toBeNull();
    expect(validateTransaction({ ...base, split: { payer: 'me', shares: { me: 1, asha: 1 } } }, a)).toMatch(/add up/);
    expect(validateTransaction({ ...base, accountId: '', split: { payer: 'asha', shares: { me: 90000 } } }, a)).toBeNull();
    expect(validateTransaction({ ...base, accountId: '' }, a)).toMatch(/account/i);
    expect(validateTransaction({ ...base, type: 'settlement', categoryId: undefined }, a)).toMatch(/friend/i);
    expect(
      validateTransaction({ ...base, type: 'settlement', friendId: 'x', categoryId: undefined }, a),
    ).toMatch(/paid or received/i);
    expect(
      validateTransaction({ ...base, type: 'settlement', friendId: 'x', settleDirection: 'paid', categoryId: undefined }, a),
    ).toBeNull();
  });
});

describe('budgets', () => {
  const cats = DEFAULT_CATEGORIES.map((c) => (c.id === 'food' ? { ...c, budget: 100000 } : c));
  const now = new Date(2026, 10, 24);
  const txns = [
    txn({ amount: 90000, categoryId: 'food' }),
    txn({ amount: 50000, categoryId: 'shopping' }),
    txn({ amount: 500000, categoryId: 'investment' }),
    txn({ amount: 99999, categoryId: 'food', date: '2026-10-05' }),
  ];
  it('tracks overall and category budgets for this month, excluding savings', () => {
    const b = monthBudgets(txns, cats, 200000, now);
    expect(b.overall).toMatchObject({ limit: 200000, spent: 140000, level: 'ok' });
    expect(b.categories).toHaveLength(1);
    expect(b.categories[0]).toMatchObject({ id: 'food', spent: 90000, level: 'warn' });
  });
  it('has no overall line when no budget is set', () => {
    expect(monthBudgets(txns, DEFAULT_CATEGORIES, undefined, now).overall).toBeUndefined();
  });
  it('classifies levels', () => {
    expect(budgetLevel(0.5)).toBe('ok');
    expect(budgetLevel(0.8)).toBe('warn');
    expect(budgetLevel(1)).toBe('over');
  });
});

describe('recurring', () => {
  const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
    id: 'r1', frequency: 'monthly', anchorDay: 31, nextDate: '2026-01-31', active: true,
    template: { type: 'expense', amount: 1200000, accountId: 'a1', categoryId: 'utilities' },
    createdAt: '2026-01-01T00:00:00.000Z', ...over,
  });
  it('steps by frequency without drifting at month end', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    expect(nextOccurrence('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    expect(nextOccurrence('2026-12-15', 'monthly', 15)).toBe('2027-01-15');
    expect(nextOccurrence('2026-11-26', 'weekly', 26)).toBe('2026-12-03');
    expect(nextOccurrence('2028-02-29', 'yearly', 29)).toBe('2029-02-28');
  });
  it('creates every missed occurrence once and sets the next date', () => {
    const { due, nextDate } = materialize(rule(), '2026-03-31');
    expect(due.map((d) => d.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(nextDate).toBe('2026-04-30');
    expect(materialize(rule({ nextDate: nextDate }), '2026-03-31').due).toHaveLength(0);
  });
  it('does nothing for paused or future rules', () => {
    expect(materialize(rule({ active: false }), '2027-01-01').due).toHaveLength(0);
    expect(materialize(rule({ nextDate: '2026-12-01' }), '2026-11-30').due).toHaveLength(0);
  });
});

describe('export and backup', () => {
  const accounts = [acct()];
  it('writes a CSV with escaping and split info', () => {
    const csv = toCSV(
      [txn({ amount: 25050, description: 'Dinner, "late"', split: { payer: 'me', shares: { me: 12525, asha: 12525 } } })],
      accounts, DEFAULT_CATEGORIES, [{ id: 'asha', name: 'Asha', createdAt: '' }],
    );
    const [header, row] = csv.split('\n');
    expect(header.startsWith('Date,Type,Amount')).toBe(true);
    expect(row).toContain('250.50');
    expect(row).toContain('"Dinner, ""late"""');
    expect(row).toContain('125.25');
    expect(row).toContain('You');
  });
  it('round-trips a backup and rejects bad files', () => {
    const data = {
      accounts, categories: DEFAULT_CATEGORIES, transactions: [txn({})], friends: [], groups: [], recurring: [], monthlyBudget: 5000000,
    };
    const parsed = parseBackup(buildBackup(data));
    expect(parsed.ok && parsed.data.transactions).toHaveLength(1);
    expect(parsed.ok && parsed.data.monthlyBudget).toBe(5000000);
    expect(parseBackup('nope').ok).toBe(false);
    expect(parseBackup('{"app":"other","data":{}}').ok).toBe(false);
    expect(parseBackup('{"app":"cashlytix","data":{"accounts":[]}}').ok).toBe(false);
  });
});

describe('plan limits', () => {
  it('limits free users and frees Pro', () => {
    expect(limitFor(false, 'accounts')).toBe(FREE_LIMITS.accounts);
    expect(atLimit(false, 'accounts', 5)).toBe(true);
    expect(atLimit(false, 'accounts', 4)).toBe(false);
    expect(atLimit(true, 'accounts', 500)).toBe(false);
  });
});
