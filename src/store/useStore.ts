import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayISO } from '@/domain/dates';
import { DEFAULT_CATEGORIES } from '@/domain/defaults';
import type { BackupData } from '@/domain/exporting';
import { validateTransaction } from '@/domain/ledger';
import { materialize } from '@/domain/recurring';
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
  resetAll: () => void;
}

type State = Data & Actions;

const initial: Data = {
  accounts: [],
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  friends: [],
  groups: [],
  recurring: [],
  monthlyBudget: undefined,
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
        set((s) => ({ accounts: [...s.accounts, { ...a, id, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) => {
        const { transactions, recurring } = get();
        const used =
          transactions.some((t) => t.accountId === id || t.toAccountId === id) ||
          recurring.some((r) => r.template.accountId === id || r.template.toAccountId === id);
        if (used) return false;
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          lastAccountId: s.lastAccountId === id ? undefined : s.lastAccountId,
        }));
        return true;
      },

      addTransaction: (t) => {
        const error = validateTransaction(t, get().accounts);
        if (error) return error;
        const txn: Transaction = { ...t, id: uid(), createdAt: new Date().toISOString() };
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
          transactions: s.transactions.map((x) => (x.id === id ? { ...t, id: x.id, createdAt: x.createdAt } : x)),
        }));
        return null;
      },
      deleteTransaction: (id) => {
        const removed = get().transactions.find((t) => t.id === id);
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        return removed;
      },
      restoreTransaction: (t) =>
        set((s) => (s.transactions.some((x) => x.id === t.id) ? s : { transactions: [...s.transactions, t] })),

      addFriend: (name) => {
        const clean = name.trim();
        const existing = get().friends.find((f) => f.name.toLowerCase() === clean.toLowerCase());
        if (existing) return existing.id;
        const id = uid();
        set((s) => ({ friends: [...s.friends, { id, name: clean, createdAt: new Date().toISOString() }] }));
        return id;
      },
      deleteFriend: (id) => {
        const used = get().transactions.some(
          (t) => t.friendId === id || (t.split && (t.split.payer === id || id in t.split.shares)),
        );
        if (used) return false;
        set((s) => ({
          friends: s.friends.filter((f) => f.id !== id),
          groups: s.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((m) => m !== id) })),
        }));
        return true;
      },
      addGroup: (name, memberIds) => {
        const id = uid();
        set((s) => ({ groups: [...s.groups, { id, name: name.trim(), memberIds, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateGroup: (id, patch) => set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          transactions: s.transactions.map((t) =>
            t.split?.groupId === id ? { ...t, split: { ...t.split, groupId: undefined } } : t,
          ),
        })),

      addCategory: (name, group) => {
        const id = `c_${uid()}`;
        set((s) => ({ categories: [...s.categories, { id, name: name.trim(), group, isDefault: false }] }));
        return id;
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat || cat.isDefault) return false;
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: 'other' } : t)),
          recurring: s.recurring.map((r) =>
            r.template.categoryId === id ? { ...r, template: { ...r.template, categoryId: 'other' } } : r,
          ),
        }));
        return true;
      },
      setMonthlyBudget: (paise) => set({ monthlyBudget: paise && paise > 0 ? paise : undefined }),

      addRecurring: (r) => {
        const id = uid();
        set((s) => ({ recurring: [...s.recurring, { ...r, id, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateRecurring: (id, patch) =>
        set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecurring: (id) => set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) })),
      applyRecurring: (today = todayISO()) => {
        const { recurring, accounts } = get();
        const created: Transaction[] = [];
        const updated = recurring.map((rule) => {
          const { due, nextDate } = materialize(rule, today);
          for (const d of due) {
            if (validateTransaction(d, accounts)) continue; // e.g. the account was deleted
            created.push({ ...d, id: uid(), createdAt: new Date().toISOString() });
          }
          return nextDate === rule.nextDate ? rule : { ...rule, nextDate };
        });
        if (created.length === 0 && updated.every((r, i) => r === recurring[i])) return 0;
        set((s) => ({ recurring: updated, transactions: [...s.transactions, ...created] }));
        return created.length;
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      importData: (d) =>
        set((s) => ({
          accounts: d.accounts,
          categories: d.categories,
          transactions: d.transactions,
          friends: d.friends,
          groups: d.groups,
          recurring: d.recurring,
          monthlyBudget: d.monthlyBudget,
          lastAccountId: undefined,
          settings: s.settings,
        })),
      resetAll: () => set((s) => ({ ...initial, settings: s.settings })),
    }),
    {
      name: 'cashlytix-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Version 1 data has no friends, groups or recurring entries; the defaults above fill them in.
      migrate: (persisted) => persisted as State,
      partialize: (s): Data => ({
        accounts: s.accounts,
        categories: s.categories,
        transactions: s.transactions,
        friends: s.friends,
        groups: s.groups,
        recurring: s.recurring,
        monthlyBudget: s.monthlyBudget,
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
