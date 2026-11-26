import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayISO } from '@/domain/dates';
import { DEFAULT_CATEGORIES } from '@/domain/defaults';
import type { BackupData } from '@/domain/exporting';
import { validateTransaction } from '@/domain/ledger';
import { materialize } from '@/domain/recurring';
import { tombstoneKey, type EntityKind, type SyncData } from '@/domain/sync';
import type {
  Account,
  Category,
  Friend,
  Group,
  NewTransaction,
  PaymentMethod,
  RecurringRule,
  Transaction,
} from '@/domain/types';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export type ThemeMode = 'system' | 'light' | 'dark';
export interface Settings {
  theme: ThemeMode;
  /** Pro preview switch. Real purchases come with accounts and billing. */
  pro: boolean;
}

interface Data {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  friends: Friend[];
  groups: Group[];
  recurring: RecurringRule[];
  monthlyBudget?: number;
  monthlyBudgetUpdatedAt?: string;
  /** Deleted records, so a delete reaches other devices when syncing. */
  deleted: Record<string, string>;
  settings: Settings;
  lastAccountId?: string;
  lastMethod?: PaymentMethod;
}

interface Actions {
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => string;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) => void;
  /** Returns false (and does nothing) when the account is still in use. */
  deleteAccount: (id: string) => boolean;

  /** Return an error message, or null on success. */
  addTransaction: (t: NewTransaction) => string | null;
  updateTransaction: (id: string, t: NewTransaction) => string | null;
  deleteTransaction: (id: string) => Transaction | undefined;
  restoreTransaction: (t: Transaction) => void;

  addFriend: (name: string) => string;
  /** False when the friend still appears in any transaction. */
  deleteFriend: (id: string) => boolean;
  addGroup: (name: string, memberIds: string[]) => string;
  updateGroup: (id: string, patch: Partial<Pick<Group, 'name' | 'memberIds'>>) => void;
  deleteGroup: (id: string) => void;

  addCategory: (name: string, group: Category['group']) => string;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'group' | 'budget'>>) => void;
  /** Custom categories only; their transactions move to "Other". */
  deleteCategory: (id: string) => boolean;
  setMonthlyBudget: (paise: number | undefined) => void;

  addRecurring: (r: Omit<RecurringRule, 'id' | 'createdAt'>) => string;
  updateRecurring: (id: string, patch: Partial<Pick<RecurringRule, 'active'>>) => void;
  deleteRecurring: (id: string) => void;
  /** Creates transactions for every recurring entry that has fallen due. Returns how many. */
  applyRecurring: (today?: string) => number;

  setSettings: (patch: Partial<Settings>) => void;
  importData: (data: BackupData) => void;
  /** Adopt data merged from the cloud. Does not change timestamps. */
  applyRemote: (data: SyncData) => void;
  resetAll: () => void;
}

type State = Data & Actions;

const now = () => new Date().toISOString();

/** Add a deleted-record marker (tombstone) for each id. */
const withTombstones = (deleted: Record<string, string>, kind: EntityKind, ids: string[]) => {
  const at = now();
  const next = { ...deleted };
  for (const id of ids) next[tombstoneKey(kind, id)] = at;
  return next;
};

/** The synced part of the store, in the shape the sync engine expects. */
export const selectSyncData = (s: Data): SyncData => ({
  accounts: s.accounts,
  categories: s.categories,
  transactions: s.transactions,
  friends: s.friends,
  groups: s.groups,
  recurring: s.recurring,
  monthlyBudget: s.monthlyBudget,
  monthlyBudgetUpdatedAt: s.monthlyBudgetUpdatedAt,
  deleted: s.deleted,
});

const initial: Data = {
  accounts: [],
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  friends: [],
  groups: [],
  recurring: [],
  monthlyBudget: undefined,
  monthlyBudgetUpdatedAt: undefined,
  deleted: {},
  settings: { theme: 'system', pro: false },
  lastAccountId: undefined,
  lastMethod: undefined,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      addAccount: (a) => {
        const id = uid();
        const at = now();
        set((s) => ({ accounts: [...s.accounts, { ...a, id, createdAt: at, updatedAt: at }] }));
        return id;
      },
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now() } : a)) })),
      deleteAccount: (id) => {
        const { transactions, recurring } = get();
        const used =
          transactions.some((t) => t.accountId === id || t.toAccountId === id) ||
          recurring.some((r) => r.template.accountId === id || r.template.toAccountId === id);
        if (used) return false;
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          deleted: withTombstones(s.deleted, 'account', [id]),
          lastAccountId: s.lastAccountId === id ? undefined : s.lastAccountId,
        }));
        return true;
      },

      addTransaction: (t) => {
        const error = validateTransaction(t, get().accounts);
        if (error) return error;
        const at = now();
        const txn: Transaction = { ...t, id: uid(), createdAt: at, updatedAt: at };
        set((s) => ({
          transactions: [...s.transactions, txn],
          lastAccountId: t.accountId || s.lastAccountId,
          lastMethod: t.paymentMethod ?? s.lastMethod,
        }));
        return null;
      },
      updateTransaction: (id, t) => {
        const error = validateTransaction(t, get().accounts);
        if (error) return error;
        set((s) => ({
          transactions: s.transactions.map((x) =>
            x.id === id ? { ...t, id: x.id, createdAt: x.createdAt, updatedAt: now() } : x,
          ),
        }));
        return null;
      },
      deleteTransaction: (id) => {
        const removed = get().transactions.find((t) => t.id === id);
        if (!removed) return undefined;
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
          deleted: withTombstones(s.deleted, 'transaction', [id]),
        }));
        return removed;
      },
      restoreTransaction: (t) =>
        set((s) => {
          if (s.transactions.some((x) => x.id === t.id)) return s;
          const deleted = { ...s.deleted };
          delete deleted[tombstoneKey('transaction', t.id)];
          // A fresh timestamp makes the restored copy beat its own delete marker on other devices.
          return { transactions: [...s.transactions, { ...t, updatedAt: now() }], deleted };
        }),

      addFriend: (name) => {
        const clean = name.trim();
        const existing = get().friends.find((f) => f.name.toLowerCase() === clean.toLowerCase());
        if (existing) return existing.id;
        const id = uid();
        const at = now();
        set((s) => ({ friends: [...s.friends, { id, name: clean, createdAt: at, updatedAt: at }] }));
        return id;
      },
      deleteFriend: (id) => {
        const used = get().transactions.some(
          (t) => t.friendId === id || (t.split && (t.split.payer === id || id in t.split.shares)),
        );
        if (used) return false;
        const at = now();
        set((s) => ({
          friends: s.friends.filter((f) => f.id !== id),
          deleted: withTombstones(s.deleted, 'friend', [id]),
          groups: s.groups.map((g) =>
            g.memberIds.includes(id) ? { ...g, memberIds: g.memberIds.filter((m) => m !== id), updatedAt: at } : g,
          ),
        }));
        return true;
      },
      addGroup: (name, memberIds) => {
        const id = uid();
        const at = now();
        set((s) => ({ groups: [...s.groups, { id, name: name.trim(), memberIds, createdAt: at, updatedAt: at }] }));
        return id;
      },
      updateGroup: (id, patch) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: now() } : g)) })),
      deleteGroup: (id) => {
        const at = now();
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          deleted: withTombstones(s.deleted, 'group', [id]),
          transactions: s.transactions.map((t) =>
            t.split?.groupId === id ? { ...t, split: { ...t.split, groupId: undefined }, updatedAt: at } : t,
          ),
        }));
      },

      addCategory: (name, group) => {
        const id = `c_${uid()}`;
        set((s) => ({
          categories: [...s.categories, { id, name: name.trim(), group, isDefault: false, updatedAt: now() }],
        }));
        return id;
      },
      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)),
        })),
      deleteCategory: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat || cat.isDefault) return false;
        const at = now();
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          deleted: withTombstones(s.deleted, 'category', [id]),
          transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: 'other', updatedAt: at } : t)),
          recurring: s.recurring.map((r) =>
            r.template.categoryId === id ? { ...r, template: { ...r.template, categoryId: 'other' }, updatedAt: at } : r,
          ),
        }));
        return true;
      },
      setMonthlyBudget: (paise) =>
        set({ monthlyBudget: paise && paise > 0 ? paise : undefined, monthlyBudgetUpdatedAt: now() }),

      addRecurring: (r) => {
        const id = uid();
        const at = now();
        set((s) => ({ recurring: [...s.recurring, { ...r, id, createdAt: at, updatedAt: at }] }));
        return id;
      },
      updateRecurring: (id, patch) =>
        set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)) })),
      deleteRecurring: (id) =>
        set((s) => ({
          recurring: s.recurring.filter((r) => r.id !== id),
          deleted: withTombstones(s.deleted, 'recurring', [id]),
        })),
      applyRecurring: (today = todayISO()) => {
        const { recurring, accounts, transactions, deleted } = get();
        const have = new Set(transactions.map((t) => t.id));
        const created: Transaction[] = [];
        const updated = recurring.map((rule) => {
          const { due, nextDate } = materialize(rule, today);
          for (const d of due) {
            // Same rule + same date always gives the same id, so two devices never log it twice.
            const id = `rec_${rule.id}_${d.date}`;
            if (have.has(id) || deleted[tombstoneKey('transaction', id)] !== undefined) continue;
            if (validateTransaction(d, accounts)) continue; // e.g. the account was deleted
            const at = now();
            created.push({ ...d, id, createdAt: at, updatedAt: at });
          }
          // Moving the due date forward is bookkeeping, not an edit, so updatedAt stays as it was.
          return nextDate === rule.nextDate ? rule : { ...rule, nextDate };
        });
        if (created.length === 0 && updated.every((r, i) => r === recurring[i])) return 0;
        set((s) => ({ recurring: updated, transactions: [...s.transactions, ...created] }));
        return created.length;
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      importData: (d) =>
        set((s) => {
          const at = now();
          const stamp = <T extends object>(list: T[]) => list.map((x) => ({ ...x, updatedAt: at }));
          let deleted = s.deleted;
          const gone = (kind: EntityKind, before: { id: string }[], after: { id: string }[]) => {
            const keep = new Set(after.map((x) => x.id));
            deleted = withTombstones(deleted, kind, before.filter((x) => !keep.has(x.id)).map((x) => x.id));
          };
          gone('account', s.accounts, d.accounts);
          // Built-in categories are never deleted, only custom ones.
          gone('category', s.categories.filter((c) => !c.isDefault), d.categories);
          gone('transaction', s.transactions, d.transactions);
          gone('friend', s.friends, d.friends);
          gone('group', s.groups, d.groups);
          gone('recurring', s.recurring, d.recurring);
          return {
            accounts: stamp(d.accounts) as Account[],
            categories: stamp(d.categories) as Category[],
            transactions: stamp(d.transactions) as Transaction[],
            friends: stamp(d.friends) as Friend[],
            groups: stamp(d.groups) as Group[],
            recurring: stamp(d.recurring) as RecurringRule[],
            monthlyBudget: d.monthlyBudget,
            monthlyBudgetUpdatedAt: at,
            deleted,
            lastAccountId: undefined,
            settings: s.settings,
          };
        }),

      applyRemote: (d) =>
        set({
          accounts: d.accounts,
          categories: d.categories.length > 0 ? d.categories : DEFAULT_CATEGORIES,
          transactions: d.transactions,
          friends: d.friends,
          groups: d.groups,
          recurring: d.recurring,
          monthlyBudget: d.monthlyBudget,
          monthlyBudgetUpdatedAt: d.monthlyBudgetUpdatedAt,
          deleted: d.deleted,
        }),

      resetAll: () =>
        set((s) => {
          let deleted = s.deleted;
          deleted = withTombstones(deleted, 'account', s.accounts.map((x) => x.id));
          deleted = withTombstones(deleted, 'transaction', s.transactions.map((x) => x.id));
          deleted = withTombstones(deleted, 'friend', s.friends.map((x) => x.id));
          deleted = withTombstones(deleted, 'group', s.groups.map((x) => x.id));
          deleted = withTombstones(deleted, 'recurring', s.recurring.map((x) => x.id));
          deleted = withTombstones(deleted, 'category', s.categories.filter((c) => !c.isDefault).map((x) => x.id));
          const at = now();
          return {
            ...initial,
            // Fresh timestamps so the cleared defaults win over any edited copy in the cloud.
            categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: at })),
            monthlyBudgetUpdatedAt: at,
            deleted,
            settings: s.settings,
          };
        }),
    }),
    {
      name: 'cashlytix-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Older saves lack friends, groups, recurring entries and sync markers; the defaults above fill them in.
      migrate: (persisted) => persisted as State,
      partialize: (s): Data => ({
        accounts: s.accounts,
        categories: s.categories,
        transactions: s.transactions,
        friends: s.friends,
        groups: s.groups,
        recurring: s.recurring,
        monthlyBudget: s.monthlyBudget,
        monthlyBudgetUpdatedAt: s.monthlyBudgetUpdatedAt,
        deleted: s.deleted,
        settings: s.settings,
        lastAccountId: s.lastAccountId,
        lastMethod: s.lastMethod,
      }),
    },
  ),
);

/** True once persisted data has been loaded from storage. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setReady(true);
    return useStore.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}
