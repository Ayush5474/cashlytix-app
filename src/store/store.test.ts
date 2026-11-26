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

import { mergeData, tombstoneKey } from '@/domain/sync';
import { selectSyncData, useStore } from './useStore';

const s = () => useStore.getState();

beforeEach(() => {
  s().resetAll();
  // resetAll keeps delete markers on purpose (they must reach the cloud), so clear them for a clean test.
  useStore.setState({ deleted: {} });
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
    s().addCategory('Pets', 'want');
    s().importData({ accounts: [], categories: s().categories.filter((c) => c.isDefault), transactions: [], friends: [], groups: [], recurring: [] });
    expect(s().settings.theme).toBe('dark');
    expect(s().categories.some((c) => c.name === 'Pets')).toBe(false);
    expect(Object.keys(s().deleted).some((k) => k.startsWith('category:c_'))).toBe(true);
    expect(s().deleted['category:food']).toBeUndefined();
  });
});

describe('store sync bookkeeping', () => {
  const acct = () => s().addAccount({ name: 'Bank', type: 'checking', openingBalance: 0, includeInTotal: true });
  const spend = (id: string) =>
    s().addTransaction({ type: 'expense', amount: 500, accountId: id, categoryId: 'food', date: '2026-11-10' });

  it('stamps records and remembers deletes', () => {
    const a = acct();
    spend(a);
    const t = s().transactions[0];
    expect(t.updatedAt).toBeTruthy();
    s().deleteTransaction(t.id);
    expect(s().deleted[tombstoneKey('transaction', t.id)]).toBeTruthy();
  });

  it('undo clears the delete marker and refreshes the timestamp', async () => {
    const a = acct();
    spend(a);
    const t = s().transactions[0];
    const removed = s().deleteTransaction(t.id)!;
    await new Promise((r) => setTimeout(r, 5));
    s().restoreTransaction(removed);
    expect(s().deleted[tombstoneKey('transaction', t.id)]).toBeUndefined();
    expect(s().transactions[0].updatedAt! > removed.updatedAt!).toBe(true);
  });

  it('recurring entries get stable ids so two devices cannot log the same one twice', () => {
    const a = acct();
    s().addRecurring({
      template: { type: 'expense', amount: 100000, accountId: a, categoryId: 'utilities' },
      frequency: 'monthly', anchorDay: 5, nextDate: '2026-10-05', active: true,
    });
    const rule = s().recurring[0];
    const before = selectSyncData(s());
    s().applyRecurring('2026-11-26');
    const phone = selectSyncData(s());
    expect(phone.transactions.map((t) => t.id).sort()).toEqual([`rec_${rule.id}_2026-10-05`, `rec_${rule.id}_2026-11-05`]);
    // A second device that also ran the rule before syncing ends up with the same two entries.
    useStore.getState().applyRemote(before);
    s().applyRecurring('2026-11-26');
    const web = selectSyncData(s());
    expect(mergeData(phone, web).transactions).toHaveLength(2);
    // A recurring entry the user deleted does not come back.
    s().applyRemote(phone);
    s().deleteTransaction(`rec_${rule.id}_2026-10-05`);
    s().applyRecurring('2026-11-26');
    expect(s().transactions).toHaveLength(1);
  });

  it('a delete on one device removes the record on the other after merging', () => {
    const a = acct();
    spend(a);
    const both = selectSyncData(s());
    s().deleteTransaction(s().transactions[0].id);
    const afterDelete = selectSyncData(s());
    s().applyRemote(mergeData(both, afterDelete));
    expect(s().transactions).toHaveLength(0);
  });

  it('resetAll deletes everything in the cloud too but keeps the built-in categories', () => {
    const a = acct();
    spend(a);
    s().addCategory('Pets', 'want');
    const custom = s().categories.find((c) => c.name === 'Pets')!;
    const txId = s().transactions[0].id;
    s().resetAll();
    expect(s().transactions).toHaveLength(0);
    expect(s().deleted[tombstoneKey('account', a)]).toBeTruthy();
    expect(s().deleted[tombstoneKey('transaction', txId)]).toBeTruthy();
    expect(s().deleted[tombstoneKey('category', custom.id)]).toBeTruthy();
    expect(s().categories.some((c) => c.id === 'food')).toBe(true);
    expect(s().deleted[tombstoneKey('category', 'food')]).toBeUndefined();
  });
});
