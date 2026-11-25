import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { T } from './components';
import { radius, useTheme } from './theme';

interface ToastMsg {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

let listener: ((t: ToastMsg | null) => void) | null = null;
let counter = 0;

/** Show a short message at the bottom, optionally with one action such as Undo. */
export function showToast(message: string, action?: { label: string; onPress: () => void }) {
  listener?.({ id: ++counter, message, actionLabel: action?.label, onAction: action?.onPress });
}

export function ToastHost() {
  const t = useTheme();
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    listener = setToast;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' }}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          backgroundColor: t.isDark ? '#F1F3F6' : '#14171C',
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 16,
          maxWidth: 480,
          marginHorizontal: 16,
        }}>
        <T color={t.isDark ? '#14171C' : '#FFFFFF'} weight="600" style={{ flexShrink: 1 }}>
          {toast.message}
        </T>
        {toast.actionLabel && (
          <Pressable
            onPress={() => {
              toast.onAction?.();
              setToast(null);
            }}
            hitSlop={10}>
            <T color={t.isDark ? '#0D9488' : '#5EEAD4'} weight="800">
              {toast.actionLabel}
            </T>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
