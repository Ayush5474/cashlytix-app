import type { Period } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = (now: Date = new Date()) => toISO(now);

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + days));
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-24" -> "24 Nov" (adds the year when it is not the current year). */
export function formatDateShort(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = `${d} ${MONTHS[m - 1]}`;
  return y === now.getFullYear() ? base : `${base} ${y}`;
}

export type PeriodId = 'this_month' | 'last_month' | 'this_year' | 'all';

export const PERIOD_OPTIONS: { id: PeriodId; label: string }[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

export function periodFor(id: PeriodId, now: Date = new Date()): Period {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case 'this_month':
      return { from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m + 1, 0)) };
    case 'last_month':
      return { from: toISO(new Date(y, m - 1, 1)), to: toISO(new Date(y, m, 0)) };
    case 'this_year':
      return { from: toISO(new Date(y, 0, 1)), to: toISO(new Date(y, 11, 31)) };
    case 'all':
      return {};
  }
}

export function inPeriod(date: string, period: Period): boolean {
  return (!period.from || date >= period.from) && (!period.to || date <= period.to);
}
