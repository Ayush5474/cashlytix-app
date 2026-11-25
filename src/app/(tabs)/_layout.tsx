import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/ui/Icon';
import { colors } from '@/ui/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  headerTitleAlign: 'left' as const,
  tabBarIcon: ({ color }: { color: unknown }) => <Icon name={icon} color={color as string} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen name="transactions" options={tab('Transactions', 'list')} />
      <Tabs.Screen name="accounts" options={tab('Accounts', 'wallet')} />
    </Tabs>
  );
}
