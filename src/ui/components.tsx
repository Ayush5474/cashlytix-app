import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, space } from './theme';

export const MAX_WIDTH = 720;

/** Scrolling page body, centred and width-limited on the web. */
export function Screen({
  children,
  scroll = true,
  bottomPad = 0,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  bottomPad?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = (
    <View style={[styles.inner, { paddingBottom: space.xl + bottomPad }, style]}>{children}</View>
  );
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>{inner}</View>
      )}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function T({
  children,
  size = 15,
  weight = '400',
  color = colors.text,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontSize: size, fontWeight: weight, color }, style]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <T size={13} weight="700" color={colors.muted} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {children}
      </T>
      {right}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
      ]}>
      <T size={14} weight="600" color={selected ? '#fff' : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  testID?: string;
}) {
  const bg = variant === 'primary' ? colors.primary : 'transparent';
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.expense : colors.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        variant !== 'primary' && { borderWidth: 1, borderColor: variant === 'danger' ? colors.expense : colors.border },
      ]}>
      <T size={16} weight="700" color={fg}>
        {label}
      </T>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Wrap({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  colorFor,
}: {
  options: { id: K; label: string }[];
  value: K;
  onChange: (id: K) => void;
  colorFor?: (id: K) => string;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.id)}
            style={[styles.segItem, active && { backgroundColor: colorFor?.(o.id) ?? colors.primary }]}>
            <T size={14} weight="700" color={active ? '#fff' : colors.muted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T size={18} weight="700">
        {title}
      </T>
      <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>
        {hint}
      </T>
      {action}
    </View>
  );
}

/** Round floating button anchored above the tab bar. */
export function Fab({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      testID="fab-add"
      accessibilityRole="button"
      accessibilityLabel="Add transaction"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom: 16, opacity: pressed ? 0.85 : 1 },
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, padding: space.lg, gap: space.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E8ECF0',
    borderRadius: radius.md,
    padding: 3,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md - 2 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl * 1.5, paddingHorizontal: space.lg },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
