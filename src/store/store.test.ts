import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => m.get(k) ?? null,
      setItem: async (k: string, v: string) => void m.set(k, v),
      removeItem: async (k: string) => void m.delete(k),
    },
  };
});

import { useStore } from './useStore';

const s = () => useStore.getState();

beforeEach(() => {
  s().resetAll();
});

describe('store', () => {
  it('rejects invalid transactions and remembers the last account', () => {
    const id = s().addAccount({ name: 'Bank', type: 'checking', openingBalance: 0, includeInTotal: true });
    expect(s().addTransaction({ type: 'expense', amount: 0, accountId: id, categoryId: 'food', date: '2026-11-10' })).toMatch(/amount/i);
    expect(s().addTransaction({ type: 'expense', amount: 500, accountId: id, categoryId: 'food', date: '2026-11-10' })).toBeNull();
    expect(s().lastAccountId).toBe(id);
  });

  it('supports undo after delete', () => {
    const id = s().addAccount({ name: 'Bank', type: 'checking', openingBalance: 0, includeInTotal: true });
    s().addTransaction({ type: 'expense', amount: 500, accountId: id, categoryId: 'food', date: '2026-11-10' });
    const removed = s().deleteTransaction(s().transactions[0].id)!;
    expect(s().transactions).toHaveLength(0);
    s().restoreTransaction(removed);
    s().restoreTransaction(removed);
    expect(s().transactions).toHaveLength(1);
  });

  it('keeps accounts and friends that are still in use', () => {
    const id = s().addAccount({ name: 'Bank', type: 'checking', openingBalance: 0, includeInTotal: true });
    const f = s().addFriend('Asha');
    expect(s().addFriend('  asha ')).toBe(f);
    s().addTransaction({
      type: 'expense', amount: 1000, accountId: id, categoryId: 'food', date: '2026-11-10',
      split: { payer: 'me', shares: { me: 500, [f]: 500 } },
    });
    expect(s().deleteAccount(id)).toBe(false);
    expect(s().deleteFriend(f)).toBe(false);
    s().deleteTransaction(s().transactions[0].id);
    expect(s().deleteFriend(f)).toBe(true);
    expect(s().deleteAccount(id)).toBe(true);
  });

  it('moves transactions to Other when a custom category is deleted', () => {
    const id = s().addAccount({ name: 'Bank', type: 'checking', openingBalance: 0, includeInTotal: true });
    const c = s().addCategory('Pets', 'want');
    s().addTransaction({ type: 'expense', amount: 500, accountId: id, categoryId: c, date: '2026-11-10' });
    expect(s().deleteCategory('food')).toBe(false);
    expect(s().deleteCategory(c)).toBe(true);
    expect(s().transactions[0].categoryId).toBe('other');
  });

  it('applies recurring entries once', () => {
    const id = s().addAccount({ name: 'Bank', type: 'checking', openingBalance: 0, includeInTotal: true });
    s().addRecurring({
      template: { type: 'expense', amount: 100000, accountId: id, categoryId: 'utilities' },
      frequency: 'monthly', anchorDay: 5, nextDate: '2026-09-05', active: true,
    });
    expect(s().applyRecurring('2026-11-26')).toBe(3);
    expect(s().applyRecurring('2026-11-26')).toBe(0);
    expect(s().recurring[0].nextDate).toBe('2026-12-05');
    expect(s().transactions.map((t) => t.date).sort()).toEqual(['2026-09-05', '2026-10-05', '2026-11-05']);
  });

  it('imports a backup but keeps settings', () => {
    s().setSettings({ theme: 'dark' });
    s().importData({ accounts: [], categories: [], transactions: [], friends: [], groups: [], recurring: [] });
    expect(s().settings.theme).toBe('dark');
  });
});
