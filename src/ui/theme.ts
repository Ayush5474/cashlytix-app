import type { CategoryGroup } from '@/domain/types';

export const colors = {
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  bg: '#F4F6F8',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  income: '#15803D',
  expense: '#DC2626',
  need: '#0F766E',
  want: '#F59E0B',
  saved: '#6366F1',
};

export const groupColor: Record<CategoryGroup, string> = {
  need: colors.need,
  want: colors.want,
  saved: colors.saved,
};

/** Distinct slice colours for the donut, assigned by rank. */
export const SLICE_COLORS = [
  '#0F766E',
  '#6366F1',
  '#F59E0B',
  '#EC4899',
  '#0EA5E9',
  '#84CC16',
  '#F97316',
  '#8B5CF6',
  '#64748B',
];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
