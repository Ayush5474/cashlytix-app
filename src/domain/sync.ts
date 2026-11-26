import type { Account, Category, Friend, Group, RecurringRule, Transaction } from './types';

/** Everything that is synced between devices. Device settings (theme, plan preview) are not. */
export interface SyncData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  friends: Friend[];
  groups: Group[];
  recurring: RecurringRule[];
  monthlyBudget?: number;
  monthlyBudgetUpdatedAt?: string;
  /** Tombstones: "kind:id" -> when it was deleted. Lets a delete on one device reach the others. */
  deleted: Record<string, string>;
}

export type EntityKind = 'account' | 'category' | 'transaction' | 'friend' | 'group' | 'recurring';

export const tombstoneKey = (kind: EntityKind, id: string) => `${kind}:${id}`;

export const emptySyncData = (): SyncData => ({
  accounts: [],
  categories: [],
  transactions: [],
  friends: [],
  groups: [],
  recurring: [],
  deleted: {},
});

type Entity = { id: string; updatedAt?: string };

const stamp = (e: Entity) => e.updatedAt ?? '';

/** The newer of two versions of the same record. Ties are broken the same way on every device. */
function newer<T extends Entity>(a: T, b: T): T {
  if (stamp(a) !== stamp(b)) return stamp(a) > stamp(b) ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

function mergeList<T extends Entity>(
  kind: EntityKind,
  a: T[],
  b: T[],
  deleted: Record<string, string>,
  combine?: (winner: T, a: T, b: T) => T,
): T[] {
  const byId = new Map<string, T>();
  for (const e of a) byId.set(e.id, e);
  for (const e of b) {
    const mine = byId.get(e.id);
    if (!mine) byId.set(e.id, e);
    else {
      const winner = newer(mine, e);
      byId.set(e.id, combine ? combine(winner, mine, e) : winner);
    }
  }
  const out: T[] = [];
  for (const e of byId.values()) {
    const gone = deleted[tombstoneKey(kind, e.id)];
    // A delete wins unless the record was changed after it (for example an Undo).
    if (gone !== undefined && gone >= stamp(e)) continue;
    out.push(e);
  }
  return out.sort((x, y) => x.id.localeCompare(y.id));
}

/** Merge two copies of the data into one. Commutative and idempotent, so devices always converge. */
export function mergeData(a: SyncData, b: SyncData): SyncData {
  const deleted: Record<string, string> = { ...a.deleted };
  for (const [k, v] of Object.entries(b.deleted)) {
    if (deleted[k] === undefined || v > deleted[k]) deleted[k] = v;
  }

  const bothBudget = a.monthlyBudgetUpdatedAt !== undefined || b.monthlyBudgetUpdatedAt !== undefined;
  const budgetFromA = (a.monthlyBudgetUpdatedAt ?? '') >= (b.monthlyBudgetUpdatedAt ?? '');
  const pick = budgetFromA ? a : b;

  return {
    accounts: mergeList('account', a.accounts, b.accounts, deleted),
    categories: mergeList('category', a.categories, b.categories, deleted),
    transactions: mergeList('transaction', a.transactions, b.transactions, deleted),
    friends: mergeList('friend', a.friends, b.friends, deleted),
    groups: mergeList('group', a.groups, b.groups, deleted),
    // The next due date only ever moves forward, so two devices never log the same entry twice.
    recurring: mergeList('recurring', a.recurring, b.recurring, deleted, (winner, x, y) => ({
      ...winner,
      nextDate: x.nextDate > y.nextDate ? x.nextDate : y.nextDate,
    })),
    monthlyBudget: bothBudget ? pick.monthlyBudget : (a.monthlyBudget ?? b.monthlyBudget),
    monthlyBudgetUpdatedAt: bothBudget ? pick.monthlyBudgetUpdatedAt : undefined,
    deleted,
  };
}

/** True when two copies hold the same data. */
export function sameData(a: SyncData, b: SyncData): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(d: SyncData) {
  const sort = <T extends Entity>(l: T[]) => [...l].sort((x, y) => x.id.localeCompare(y.id));
  return {
    accounts: sort(d.accounts),
    categories: sort(d.categories),
    transactions: sort(d.transactions),
    friends: sort(d.friends),
    groups: sort(d.groups),
    recurring: sort(d.recurring),
    monthlyBudget: d.monthlyBudget ?? null,
    monthlyBudgetUpdatedAt: d.monthlyBudgetUpdatedAt ?? null,
    deleted: Object.fromEntries(Object.entries(d.deleted).sort(([x], [y]) => x.localeCompare(y))),
  };
}

/** Where the cloud copy lives. Supabase implements this; tests use an in-memory fake. */
export interface Remote {
  fetch(): Promise<{ data: SyncData | null; rev: number }>;
  /** Writes only if the cloud copy is still at `expectedRev` (null = no copy yet). Returns false on a clash. */
  push(data: SyncData, expectedRev: number | null): Promise<boolean>;
}

export interface SyncOutcome {
  merged: SyncData;
  /** The merged result differs from what this device had, so the app should adopt it. */
  changedLocal: boolean;
  pushed: boolean;
}

/**
 * Pull, merge, push. If another device wrote in between, start again from the new cloud copy.
 * Throws after `maxTries` clashes so the caller can show an error and retry later.
 */
export async function runSync(local: SyncData, remote: Remote, maxTries = 4): Promise<SyncOutcome> {
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const { data: cloud, rev } = await remote.fetch();
    const merged = cloud ? mergeData(local, cloud) : local;
    const needsPush = !cloud || !sameData(merged, cloud);
    if (!needsPush) return { merged, changedLocal: !sameData(merged, local), pushed: false };
    if (await remote.push(merged, cloud ? rev : null)) {
      return { merged, changedLocal: !sameData(merged, local), pushed: true };
    }
  }
  throw new Error('Could not sync: your data changed on another device at the same time. Try again.');
}
