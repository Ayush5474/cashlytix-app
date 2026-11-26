import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useHydrated, useStore } from '@/store/useStore';
import { useSyncManager } from '@/sync/useSync';
import { showToast, ToastHost } from '@/ui/toast';
import { useTheme } from '@/ui/theme';

const sheet = { presentation: 'transparentModal', animation: 'fade' } as const;

export default function RootLayout() {
  const hydrated = useHydrated();
  const t = useTheme();
  useSyncManager();

  useEffect(() => {
    if (!hydrated) return;
    const added = useStore.getState().applyRecurring();
    if (added > 0) showToast(`Added ${added} recurring ${added === 1 ? 'entry' : 'entries'}`);
  }, [hydrated]);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <StatusBar style={t.isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={sheet} />
          <Stack.Screen name="account-form" options={sheet} />
          <Stack.Screen name="category-form" options={sheet} />
          <Stack.Screen name="friend-form" options={sheet} />
          <Stack.Screen name="group-form" options={sheet} />
          <Stack.Screen name="settle" options={sheet} />
          <Stack.Screen name="recurring-form" options={sheet} />
          <Stack.Screen name="upgrade" options={sheet} />
          <Stack.Screen name="auth" options={sheet} />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
