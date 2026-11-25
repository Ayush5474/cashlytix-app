import type { Frequency, NewTransaction, RecurringRule } from './types';
import { toISO } from './dates';

const daysInMonth = (year: number, month0: number) => new Date(year, month0 + 1, 0).getDate();

/** The date after `date` for this frequency. `anchorDay` keeps month-end rules from drifting. */
export function nextOccurrence(date: string, frequency: Frequency, anchorDay: number): string {
  const [y, m, d] = date.split('-').map(Number);
  if (frequency === 'weekly') return toISO(new Date(y, m - 1, d + 7));
  if (frequency === 'monthly') {
    const ny = m === 12 ? y + 1 : y;
    const nm0 = m === 12 ? 0 : m;
    return toISO(new Date(ny, nm0, Math.min(anchorDay, daysInMonth(ny, nm0))));
  }
  const ny = y + 1;
  return toISO(new Date(ny, m - 1, Math.min(anchorDay, daysInMonth(ny, m - 1))));
}

/** Transactions that have fallen due up to and including `today`, and the rule's new next date. */
export function materialize(rule: RecurringRule, today: string): { due: NewTransaction[]; nextDate: string } {
  const due: NewTransaction[] = [];
  let next = rule.nextDate;
  if (!rule.active) return { due, nextDate: next };
  // The cap protects against a very old rule flooding the ledger.
  for (let i = 0; i < 366 && next <= today; i++) {
    due.push({ ...rule.template, date: next });
    next = nextOccurrence(next, rule.frequency, rule.anchorDay);
  }
  return { due, nextDate: next };
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};
