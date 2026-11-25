import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/** Short vibration on phones. Silent on the web and when the device has no motor. */
export function haptic(kind: 'light' | 'select' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'select') void Haptics.selectionAsync();
    else if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are a nicety, never a requirement
  }
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** Counts from the previous value to `target`, so balances roll instead of jumping. */
export function useCountUp(target: number, ms = 700): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / ms);
      current.current = from + (target - from) * easeOut(p);
      setValue(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return Math.round(value);
}

/** 0 to 1 over `ms`, restarting whenever `key` changes. Drives chart and bar draw-in. */
export function useProgress(key: unknown, ms = 700): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const v = Math.min(1, (Date.now() - start) / ms);
      setP(easeOut(v));
      if (v < 1) raf = requestAnimationFrame(tick);
    };
    setP(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, ms]);
  return p;
}
