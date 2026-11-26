/** All money is stored as integer paise (1 rupee = 100 paise) to avoid float errors. */

export type AccountType =
  | 'checking'
  | 'saving'
  | 'investment'
  | 'cash'
  | 'wallet'
  | 'credit_card';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Balance when the account was added. For a credit card this is the amount already owed. */
  openingBalance: number;
  /** Whether this account counts toward the Dashboard "Total Balance". */
  includeInTotal: boolean;
  createdAt: string;
  /** Last change, ISO time. Used to merge edits made on different devices. */
  updatedAt?: string;
}

/** Saved = Saving and Investment categories. Custom categories are need or want only. */
export type CategoryGroup = 'need' | 'want' | 'saved';

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  /** Optional monthly budget in paise. */
  budget?: number;
  isDefault: boolean;
  updatedAt?: string;
}

export type TxnType = 'expense' | 'income' | 'transfer' | 'settlement';
export type PaymentMethod = 'online' | 'offline' | 'credit_card';
export type NeedWant = 'need' | 'want';
export type InvestmentKind = 'mutual_funds' | 'stocks' | 'gold' | 'fd' | 'rd' | 'other';

export interface Transaction {
  id: string;
  type: TxnType;
  /** Always positive, in paise. */
  amount: number;
  /** Pay-from account for expenses and transfers, receiving account for income. */
  accountId: string;
  /** Receiving account for transfers. */
  toAccountId?: string;
  categoryId?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  /** Overrides the category's group for the Need / Want split. */
  needWant?: NeedWant;
  investmentKind?: InvestmentKind;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Present when the bill was shared with friends. `amount` is then the full bill. */
  split?: SplitInfo;
  /** Settlements only: the friend money was received from or paid to. */
  friendId?: string;
  settleDirection?: 'received' | 'paid';
  createdAt: string;
  updatedAt?: string;
}

/** Who paid and how the bill is divided. Person ids are 'me' or a friend id. */
export interface SplitInfo {
  payer: string;
  /** Paise per person; always adds up to the transaction amount. */
  shares: Record<string, number>;
  groupId?: string;
}

export interface Friend {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export type Frequency = 'weekly' | 'monthly' | 'yearly';

/** A repeating entry (rent, EMI, SIP, salary...). Creates real transactions as they fall due. */
export interface RecurringRule {
  id: string;
  template: Omit<NewTransaction, 'date' | 'split' | 'friendId' | 'settleDirection'>;
  frequency: Frequency;
  /** Day of month the rule was created on, so month-end dates do not drift. */
  anchorDay: number;
  nextDate: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

/** Inclusive date range of YYYY-MM-DD strings. A missing bound means unbounded. */
export interface Period {
  from?: string;
  to?: string;
}
