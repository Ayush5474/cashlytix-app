import { useColorScheme } from 'react-native';

import type { CategoryGroup } from '@/domain/types';
import { useStore } from '@/store/useStore';

export interface Palette {
  bg: string;
  /** Flat card / input fill. */
  surface: string;
  /** Slightly stronger fill for pressed states and tracks. */
  track: string;
  text: string;
  muted: string;
  faint: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  income: string;
  expense: string;
  warn: string;
  need: string;
  want: string;
  saved: string;
  overlay: string;
}

const light: Palette = {
  bg: '#FFFFFF',
  surface: '#F5F6F8',
  track: '#E8EBEF',
  text: '#14171C',
  muted: '#6B7380',
  faint: '#9AA2AE',
  border: '#ECEEF1',
  primary: '#0D9488',
  onPrimary: '#FFFFFF',
  primarySoft: '#E0F5F2',
  income: '#0E9F6E',
  expense: '#E5484D',
  warn: '#F59E0B',
  need: '#0D9488',
  want: '#F59E0B',
  saved: '#6366F1',
  overlay: 'rgba(15,18,24,0.45)',
};

const dark: Palette = {
  bg: '#0C0F14',
  surface: '#161A21',
  track: '#222731',
  text: '#F1F3F6',
  muted: '#9099A6',
  faint: '#667080',
  border: '#1E232C',
  primary: '#2DD4BF',
  onPrimary: '#06201C',
  primarySoft: '#10302C',
  income: '#34D399',
  expense: '#F87171',
  warn: '#FBBF24',
  need: '#2DD4BF',
  want: '#FBBF24',
  saved: '#818CF8',
  overlay: 'rgba(0,0,0,0.6)',
};

export interface Theme extends Palette {
  isDark: boolean;
}

export function useTheme(): Theme {
  const mode = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return { ...(isDark ? dark : light), isDark };
}

export const groupColor = (t: Palette, g: CategoryGroup) => (g === 'need' ? t.need : g === 'want' ? t.want : t.saved);

/** Distinct slice colours for the donut, assigned by rank. */
export const SLICE_COLORS = ['#0D9488', '#6366F1', '#F59E0B', '#EC4899', '#0EA5E9', '#84CC16', '#F97316', '#8B5CF6', '#64748B'];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
