import { describe, expect, it } from 'vitest';

import { emptySyncData, mergeData, runSync, sameData, tombstoneKey, type Remote, type SyncData } from './sync';
import type { Account, RecurringRule, Transaction } from './types';

const acct = (id: string, updatedAt: string, name = id): Account => ({
  id, name, type: 'cash', openingBalance: 0, includeInTotal: true, createdAt: '2026-11-01T00:00:00.000Z', updatedAt,
});
const txn = (id: string, updatedAt: string, amount = 100): Transaction => ({
  id, type: 'expense', amount, accountId: 'a', categoryId: 'food', date: '2026-11-10', createdAt: '2026-11-10T00:00:00.000Z', updatedAt,
});
const data = (over: Partial<SyncData>): SyncData => ({ ...emptySyncData(), ...over });

describe('mergeData', () => {
  it('keeps records from both devices', () => {
    const m = mergeData(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] }), data({ transactions: [txn('t2', '2026-11-10T11:00:00Z')] }));
    expect(m.transactions.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('takes the newer edit of the same record', () => {
    const phone = data({ accounts: [acct('a', '2026-11-10T10:00:00Z', 'Old name')] });
    const web = data({ accounts: [acct('a', '2026-11-10T12:00:00Z', 'New name')] });
    expect(mergeData(phone, web).accounts[0].name).toBe('New name');
    expect(mergeData(web, phone).accounts[0].name).toBe('New name');
  });

  it('applies deletes made on another device', () => {
    const phone = data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] });
    const web = data({ deleted: { [tombstoneKey('transaction', 't1')]: '2026-11-11T09:00:00Z' } });
    expect(mergeData(phone, web).transactions).toHaveLength(0);
    expect(mergeData(web, phone).transactions).toHaveLength(0);
  });

  it('lets an Undo after a delete win', () => {
    const restored = data({ transactions: [txn('t1', '2026-11-11T09:05:00Z')] });
    const web = data({ deleted: { [tombstoneKey('transaction', 't1')]: '2026-11-11T09:00:00Z' } });
    expect(mergeData(restored, web).transactions).toHaveLength(1);
  });

  it('is commutative and idempotent', () => {
    const a = data({
      accounts: [acct('a', '2026-11-10T10:00:00Z', 'A')],
      transactions: [txn('t1', '2026-11-10T10:00:00Z', 1), txn('t3', '2026-11-12T00:00:00Z')],
      deleted: { [tombstoneKey('transaction', 't9')]: '2026-11-09T00:00:00Z' },
      monthlyBudget: 100, monthlyBudgetUpdatedAt: '2026-11-10T00:00:00Z',
    });
    const b = data({
      accounts: [acct('a', '2026-11-10T11:00:00Z', 'B')],
      transactions: [txn('t1', '2026-11-10T11:00:00Z', 2), txn('t2', '2026-11-10T11:00:00Z')],
      deleted: { [tombstoneKey('transaction', 't3')]: '2026-11-13T00:00:00Z' },
      monthlyBudget: 200, monthlyBudgetUpdatedAt: '2026-11-11T00:00:00Z',
    });
    const ab = mergeData(a, b);
    expect(sameData(ab, mergeData(b, a))).toBe(true);
    expect(sameData(mergeData(ab, ab), ab)).toBe(true);
    expect(sameData(mergeData(ab, a), ab)).toBe(true);
    expect(ab.monthlyBudget).toBe(200);
    expect(ab.transactions.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(ab.transactions[0].amount).toBe(2);
  });

  it('breaks identical timestamps the same way on both devices', () => {
    const x = data({ accounts: [acct('a', '2026-11-10T10:00:00Z', 'X')] });
    const y = data({ accounts: [acct('a', '2026-11-10T10:00:00Z', 'Y')] });
    expect(mergeData(x, y).accounts[0].name).toBe(mergeData(y, x).accounts[0].name);
  });

  it('moves a recurring rule forward only, so two devices never log an entry twice', () => {
    const rule = (next: string, updatedAt: string, active = true): RecurringRule => ({
      id: 'r1', frequency: 'monthly', anchorDay: 5, nextDate: next, active, createdAt: '2026-01-01T00:00:00Z', updatedAt,
      template: { type: 'expense', amount: 100, accountId: 'a', categoryId: 'utilities' },
    });
    const m = mergeData(data({ recurring: [rule('2026-12-05', '2026-11-05T00:00:00Z')] }), data({ recurring: [rule('2026-11-05', '2026-11-20T00:00:00Z', false)] }));
    expect(m.recurring[0].active).toBe(false); // newer edit wins
    expect(m.recurring[0].nextDate).toBe('2026-12-05'); // but the date never goes back
  });
});

/** A tiny in-memory cloud with the same compare-and-swap rule as the real database. */
function fakeCloud(initial?: SyncData) {
  let stored = initial ?? null;
  let rev = initial ? 1 : 0;
  let pushes = 0;
  let sneak: (() => void) | null = null;
  const remote: Remote = {
    async fetch() {
      return { data: stored ? structuredClone(stored) : null, rev };
    },
    async push(d, expectedRev) {
      sneak?.();
      sneak = null;
      if ((expectedRev ?? 0) !== rev) return false;
      stored = structuredClone(d);
      rev += 1;
      pushes += 1;
      return true;
    },
  };
  return { remote, get stored() { return stored; }, get pushes() { return pushes; }, onNextPush: (fn: () => void) => (sneak = fn), set: (d: SyncData) => { stored = d; rev += 1; } };
}

describe('runSync', () => {
  it('uploads local data the first time', async () => {
    const cloud = fakeCloud();
    const local = data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] });
    const r = await runSync(local, cloud.remote);
    expect(r.pushed).toBe(true);
    expect(r.changedLocal).toBe(false);
    expect(cloud.stored?.transactions).toHaveLength(1);
  });

  it('downloads what another device added and does not push when nothing is new', async () => {
    const cloud = fakeCloud(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z'), txn('t2', '2026-11-10T11:00:00Z')] }));
    const local = data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] });
    const r = await runSync(local, cloud.remote);
    expect(r.changedLocal).toBe(true);
    expect(r.pushed).toBe(false);
    expect(r.merged.transactions).toHaveLength(2);
    expect(cloud.pushes).toBe(0);
  });

  it('merges and pushes when both sides have changes', async () => {
    const cloud = fakeCloud(data({ transactions: [txn('t2', '2026-11-10T11:00:00Z')] }));
    const r = await runSync(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] }), cloud.remote);
    expect(r.pushed && r.changedLocal).toBe(true);
    expect(cloud.stored?.transactions).toHaveLength(2);
  });

  it('retries when another device writes in the middle', async () => {
    const cloud = fakeCloud(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] }));
    cloud.onNextPush(() => cloud.set(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z'), txn('t3', '2026-11-10T12:00:00Z')] })));
    const r = await runSync(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z'), txn('t2', '2026-11-10T11:00:00Z')] }), cloud.remote);
    expect(r.merged.transactions.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    expect(cloud.stored?.transactions).toHaveLength(3);
  });

  it('gives up with a clear error after repeated clashes', async () => {
    const cloud = fakeCloud(data({}));
    const always: Remote = { fetch: cloud.remote.fetch, push: async () => false };
    await expect(runSync(data({ transactions: [txn('t1', '2026-11-10T10:00:00Z')] }), always, 2)).rejects.toThrow(/another device/);
  });

  it('two devices converge on the same data', async () => {
    const cloud = fakeCloud();
    let phone = data({ transactions: [txn('p1', '2026-11-10T10:00:00Z')], accounts: [acct('a', '2026-11-10T09:00:00Z')] });
    let web = data({ transactions: [txn('w1', '2026-11-10T10:30:00Z')] });
    phone = (await runSync(phone, cloud.remote)).merged;
    web = (await runSync(web, cloud.remote)).merged;
    // phone deletes p1, web edits the account
    phone = { ...phone, transactions: [], deleted: { ...phone.deleted, [tombstoneKey('transaction', 'p1')]: '2026-11-10T12:00:00Z' } };
    web = { ...web, accounts: [acct('a', '2026-11-10T12:30:00Z', 'Renamed')] };
    phone = (await runSync(phone, cloud.remote)).merged;
    web = (await runSync(web, cloud.remote)).merged;
    phone = (await runSync(phone, cloud.remote)).merged;
    expect(sameData(phone, web)).toBe(true);
    expect(phone.transactions.map((t) => t.id)).toEqual(['w1']);
    expect(phone.accounts[0].name).toBe('Renamed');
  });
});
