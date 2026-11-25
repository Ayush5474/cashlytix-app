import type { Account, AccountType, NewTransaction, Transaction } from './types';
import { isValidISO } from './dates';

/** A credit card is a liability: spending raises what you owe, paying the bill lowers it. */
export const isLiability = (type: AccountType) => type === 'credit_card';

const leaves = (type: AccountType, amount: number) => (isLiability(type) ? amount : -amount);
const arrives = (type: AccountType, amount: number) => (isLiability(type) ? -amount : amount);

/**
 * Current balance of an account: its opening balance plus every transaction touching it.
 * Because the balance is always derived, editing or deleting a transaction can never leave it wrong.
 */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.openingBalance;
  for (const t of transactions) {
    if (t.accountId === account.id) {
      balance += t.type === 'income' ? arrives(account.type, t.amount) : leaves(account.type, t.amount);
    }
    if (t.type === 'transfer' && t.toAccountId === account.id) {
      balance += arrives(account.type, t.amount);
    }
  }
  return balance;
}

/** Sum of included accounts. Credit-card outstanding is subtracted. */
export function totalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => a.includeInTotal)
    .reduce((sum, a) => {
      const b = accountBalance(a, transactions);
      return sum + (isLiability(a.type) ? -b : b);
    }, 0);
}

/** Returns an error message, or null when the transaction is valid. */
export function validateTransaction(t: NewTransaction, accounts: Account[]): string | null {
  if (!Number.isInteger(t.amount) || t.amount <= 0) return 'Enter an amount greater than zero.';
  if (!accounts.some((a) => a.id === t.accountId)) return 'Choose an account.';
  if (!isValidISO(t.date)) return 'Enter the date as YYYY-MM-DD.';
  if (t.type === 'expense' && !t.categoryId) return 'Choose a category.';
  if (t.type === 'transfer') {
    if (!t.toAccountId || !accounts.some((a) => a.id === t.toAccountId)) return 'Choose the account to send to.';
    if (t.toAccountId === t.accountId) return 'Choose two different accounts.';
  }
  return null;
}
