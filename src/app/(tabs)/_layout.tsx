import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { Icon, type IconName } from '@/ui/Icon';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const t = useTheme();
  const tab = (title: string, icon: IconName) => ({
    title,
    tabBarIcon: ({ color }: { color: unknown }) => <Icon name={icon} color={color as string} />,
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.faint,
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
          ...(Platform.OS === 'web' ? { height: 66, paddingTop: 6, paddingBottom: 8 } : { paddingTop: 4 }),
        },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen name="transactions" options={tab('Activity', 'list')} />
      <Tabs.Screen name="split" options={tab('Split', 'users')} />
      <Tabs.Screen name="accounts" options={tab('Accounts', 'wallet')} />
      <Tabs.Screen name="more" options={tab('More', 'more')} />
    </Tabs>
  );
}
