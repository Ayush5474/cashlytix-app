import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { haptic } from './motion';
import { radius, space, useTheme } from './theme';

export const MAX_WIDTH = 720;

/* ---------- text ---------- */

export function T({
  children,
  size = 15,
  weight = '400',
  color,
  style,
  numberOfLines,
  testID,
}: {
  children: ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  testID?: string;
}) {
  const t = useTheme();
  return (
    <Text testID={testID} numberOfLines={numberOfLines} style={[{ fontSize: size, fontWeight: weight, color: color ?? t.text }, style]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T size={13} weight="700" color={t.muted} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {children}
      </T>
      {right}
    </View>
  );
}

/* ---------- press feedback ---------- */

const APressable = Animated.createAnimatedComponent(Pressable);

/** A pressable that springs down slightly when touched. */
export function Pressy({
  children,
  style,
  onPress,
  scaleTo = 0.97,
  buzz = true,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  buzz?: boolean;
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      onPressIn={() => {
        s.value = withSpring(scaleTo, { damping: 16, stiffness: 420 });
      }}
      onPressOut={() => {
        s.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      onPress={(e) => {
        if (buzz) haptic('light');
        onPress?.(e);
      }}
      style={[style, a]}>
      {children}
    </APressable>
  );
}

/* ---------- layout ---------- */

export function Header({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ alignItems: 'center', backgroundColor: t.bg, paddingTop: insets.top }}>
      <View
        style={{
          width: '100%',
          maxWidth: MAX_WIDTH,
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
        }}>
        {back && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityLabel="Back"
            hitSlop={12}>
            <Icon name="back" color={t.text} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <T size={26} weight="800" style={{ letterSpacing: -0.5 }}>
            {title}
          </T>
          {subtitle ? (
            <T size={13} color={t.muted}>
              {subtitle}
            </T>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Page body, centred and width-limited on the web. */
export function Screen({
  children,
  header,
  bottomPad = 0,
  scroll = true,
}: {
  children: ReactNode;
  header?: ReactNode;
  bottomPad?: number;
  scroll?: boolean;
}) {
  const t = useTheme();
  const body = (
    <View style={{ width: '100%', maxWidth: MAX_WIDTH, padding: space.lg, gap: space.lg, paddingBottom: space.xl + bottomPad }}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>{body}</View>
      )}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>;
}

export function Wrap({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border }} />;
}

/** Fades and slides up when it first appears; stagger with `index`. */
export function Reveal({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return <Animated.View entering={FadeIn.delay(Math.min(index, 8) * 45).duration(320)}>{children}</Animated.View>;
}

/* ---------- controls ---------- */

export function Chip({
  label,
  selected,
  onPress,
  color,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  testID?: string;
}) {
  const t = useTheme();
  const bg = color ?? t.primary;
  return (
    <Pressy
      testID={testID}
      onPress={onPress}
      buzz={false}
      accessibilityState={{ selected: !!selected }}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: selected ? bg : t.surface,
      }}>
      <T size={14} weight="600" color={selected ? t.onPrimary : t.text}>
        {label}
      </T>
    </Pressy>
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
  variant?: 'primary' | 'soft' | 'danger';
  disabled?: boolean;
  testID?: string;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? 'transparent' : t.primarySoft;
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? t.expense : t.primary;
  return (
    <Pressy
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={{
        minHeight: 52,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.lg,
        backgroundColor: bg,
        opacity: disabled ? 0.4 : 1,
        borderWidth: variant === 'danger' ? 1 : 0,
        borderColor: t.expense,
      }}>
      <T size={16} weight="700" color={fg}>
        {label}
      </T>
    </Pressy>
  );
}

/** Pill switcher with a sliding highlight. */
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
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const segW = width > 0 ? (width - 6) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(idx * segW, { damping: 20, stiffness: 260 });
  }, [idx, segW, x]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: radius.md, padding: 3 }}>
      {segW > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 3,
              top: 3,
              bottom: 3,
              width: segW,
              borderRadius: radius.md - 3,
              backgroundColor: colorFor?.(value) ?? t.primary,
            },
            slide,
          ]}
        />
      )}
      {options.map((o) => (
        <Pressable
          key={o.id}
          accessibilityRole="button"
          accessibilityState={{ selected: o.id === value }}
          onPress={() => {
            haptic('select');
            onChange(o.id);
          }}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
          <T size={14} weight="700" color={o.id === value ? t.onPrimary : t.muted}>
            {o.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <T size={12} weight="700" color={t.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={t.faint}
        {...input}
        style={[
          {
            backgroundColor: t.surface,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 16,
            color: t.text,
          },
          input.style,
        ]}
      />
    </View>
  );
}

export const Label = ({ children }: { children: string }) => {
  const t = useTheme();
  return (
    <T size={12} weight="700" color={t.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
      {children}
    </T>
  );
};

/** A tappable settings-style row with a title, optional subtitle and a chevron. */
export function NavRow({
  title,
  subtitle,
  onPress,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  testID?: string;
}) {
  const t = useTheme();
  return (
    <Pressy
      testID={testID}
      onPress={onPress}
      scaleTo={0.985}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="700">{title}</T>
        {subtitle ? (
          <T size={13} color={t.muted}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && <Icon name="chevron" size={18} color={t.faint} />}
    </Pressy>
  );
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl * 1.5, paddingHorizontal: space.lg }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: t.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.sm,
        }}>
        <Icon name="wallet" size={28} color={t.primary} />
      </View>
      <T size={18} weight="800">
        {title}
      </T>
      <T size={14} color={t.muted} style={{ textAlign: 'center', marginBottom: space.sm }}>
        {hint}
      </T>
      {action}
    </Animated.View>
  );
}

export function Fab({ onPress, label = 'Add transaction' }: { onPress: () => void; label?: string }) {
  const t = useTheme();
  return (
    <Animated.View entering={ZoomIn.delay(250).springify()} style={{ position: 'absolute', right: 20, bottom: 18 }}>
      <Pressy
        testID="fab-add"
        accessibilityLabel={label}
        onPress={onPress}
        scaleTo={0.9}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: t.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        }}>
        <Icon name="plus" size={28} color={t.onPrimary} />
      </Pressy>
    </Animated.View>
  );
}

/* ---------- bottom sheet ---------- */

/**
 * Modal sheet that slides up over the current screen. Use as the whole body of a
 * `transparentModal` route; `onClose` is called by the backdrop and the close button.
 */
export function Sheet({
  title,
  onClose,
  children,
  right,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  right?: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', inset: 0, backgroundColor: t.overlay }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(300)}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '94%',
          backgroundColor: t.bg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: 'hidden',
        }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.track }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md }}>
          <Pressable onPress={onClose} accessibilityLabel="Close sheet" hitSlop={12}>
            <Icon name="close" color={t.text} />
          </Pressable>
          <T size={17} weight="800" style={{ flex: 1 }}>
            {title}
          </T>
          {right}
        </View>
        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ padding: space.lg, paddingTop: space.sm, gap: space.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer && (
          <View
            style={{
              paddingHorizontal: space.lg,
              paddingTop: space.md,
              paddingBottom: Math.max(insets.bottom, space.lg),
              borderTopWidth: 1,
              borderTopColor: t.border,
              backgroundColor: t.bg,
            }}>
            {footer}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/** Close helper for sheet routes. */
export const closeSheet = () => (router.canGoBack() ? router.back() : router.replace('/'));
