import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_CATEGORIES } from '@/domain/defaults';
import { validateTransaction } from '@/domain/ledger';
import type {
  Account,
  Category,
  NewTransaction,
  PaymentMethod,
  Transaction,
} from '@/domain/types';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface State {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  lastAccountId?: string;
  lastMethod?: PaymentMethod;

  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => string;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) => void;
  /** Returns false (and does nothing) when the account still has transactions. */
  deleteAccount: (id: string) => boolean;

  /** Returns an error message, or null on success. */
  addTransaction: (t: NewTransaction) => string | null;
  updateTransaction: (id: string, t: NewTransaction) => string | null;
  deleteTransaction: (id: string) => void;

  resetAll: () => void;
}

const initial = {
  accounts: [] as Account[],
  categories: DEFAULT_CATEGORIES,
  transactions: [] as Transaction[],
  lastAccountId: undefined as string | undefined,
  lastMethod: undefined as PaymentMethod | undefined,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      addAccount: (a) => {
        const id = uid();
        set((s) => ({
          accounts: [...s.accounts, { ...a, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      deleteAccount: (id) => {
        const used = get().transactions.some((t) => t.accountId === id || t.toAccountId === id);
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
          lastAccountId: t.accountId,
          lastMethod: t.paymentMethod ?? s.lastMethod,
        }));
        return null;
      },

      updateTransaction: (id, t) => {
        const error = validateTransaction(t, get().accounts);
        if (error) return error;
        set((s) => ({
          transactions: s.transactions.map((x) =>
            x.id === id ? { ...t, id: x.id, createdAt: x.createdAt } : x,
          ),
        }));
        return null;
      },

      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      resetAll: () => set({ ...initial }),
    }),
    {
      name: 'cashlytix-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        accounts: s.accounts,
        categories: s.categories,
        transactions: s.transactions,
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
