import type {
  AccountType,
  Category,
  InvestmentKind,
  PaymentMethod,
} from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', group: 'need', isDefault: true },
  { id: 'transport', name: 'Transport', group: 'need', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', group: 'want', isDefault: true },
  { id: 'utilities', name: 'Utilities', group: 'need', isDefault: true },
  { id: 'shopping', name: 'Shopping', group: 'want', isDefault: true },
  { id: 'saving', name: 'Saving', group: 'saved', isDefault: true },
  { id: 'investment', name: 'Investment', group: 'saved', isDefault: true },
  { id: 'other', name: 'Other', group: 'want', isDefault: true },
];

export const INVESTMENT_CATEGORY_ID = 'investment';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Checking',
  saving: 'Saving',
  investment: 'Investment',
  cash: 'Cash',
  wallet: 'Wallet',
  credit_card: 'Credit card',
};

export const ACCOUNT_TYPES: AccountType[] = [
  'checking',
  'saving',
  'investment',
  'cash',
  'wallet',
  'credit_card',
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  online: 'Online',
  offline: 'Offline',
  credit_card: 'Credit card',
};

export const INVESTMENT_KIND_LABEL: Record<InvestmentKind, string> = {
  mutual_funds: 'Mutual funds',
  stocks: 'Stocks',
  gold: 'Gold',
  fd: 'FD',
  rd: 'RD',
  other: 'Other',
};

export const INVESTMENT_KINDS: InvestmentKind[] = [
  'mutual_funds',
  'stocks',
  'gold',
  'fd',
  'rd',
  'other',
];
