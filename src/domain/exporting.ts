import type { Account, Category, Friend, Frequency, Group, RecurringRule, Transaction } from './types';

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  friends: Friend[];
  groups: Group[];
  recurring: RecurringRule[];
  monthlyBudget?: number;
}

const csvCell = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rupees = (paise: number) => (paise / 100).toFixed(2);

export function toCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  friends: Friend[],
): string {
  const acct = new Map(accounts.map((a) => [a.id, a.name]));
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const fr = new Map(friends.map((f) => [f.id, f.name]));
  const header = [
    'Date', 'Type', 'Amount', 'Category', 'Account', 'To account', 'Note',
    'Payment method', 'Need/Want', 'Your share', 'Paid by', 'Friend',
  ];
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) =>
      [
        t.date,
        t.type,
        rupees(t.amount),
        t.categoryId ? (cat.get(t.categoryId) ?? '') : '',
        acct.get(t.accountId) ?? '',
        t.toAccountId ? (acct.get(t.toAccountId) ?? '') : '',
        t.description ?? '',
        t.paymentMethod ?? '',
        t.needWant ?? '',
        t.split ? rupees(t.split.shares.me ?? 0) : '',
        t.split ? (t.split.payer === 'me' ? 'You' : (fr.get(t.split.payer) ?? '')) : '',
        t.friendId ? (fr.get(t.friendId) ?? '') : '',
      ].map(csvCell).join(','),
    );
  return [header.join(','), ...rows].join('\n');
}

export function buildBackup(data: BackupData, now: Date = new Date()): string {
  return JSON.stringify({ app: 'cashlytix', version: 2, exportedAt: now.toISOString(), data }, null, 2);
}

export type ParsedBackup = { ok: true; data: BackupData } | { ok: false; error: string };

const FREQ: Frequency[] = ['weekly', 'monthly', 'yearly'];

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This is not a valid backup file.' };
  }
  const root = raw as { app?: string; data?: Partial<BackupData> };
  if (!root || root.app !== 'cashlytix' || !root.data) return { ok: false, error: 'This is not a Cashlytix backup.' };
  const d = root.data;
  if (!Array.isArray(d.accounts) || !Array.isArray(d.transactions) || !Array.isArray(d.categories)) {
    return { ok: false, error: 'The backup is missing accounts, categories or transactions.' };
  }
  const recurring = (Array.isArray(d.recurring) ? d.recurring : []).filter((r) => FREQ.includes(r.frequency));
  return {
    ok: true,
    data: {
      accounts: d.accounts,
      categories: d.categories,
      transactions: d.transactions,
      friends: Array.isArray(d.friends) ? d.friends : [],
      groups: Array.isArray(d.groups) ? d.groups : [],
      recurring,
      monthlyBudget: typeof d.monthlyBudget === 'number' ? d.monthlyBudget : undefined,
    },
  };
}
