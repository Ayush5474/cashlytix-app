import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FREE_LIMITS, LIMIT_LABEL, type LimitKey } from '@/domain/plan';
import { useStore } from '@/store/useStore';
import { Button, Sheet, T, closeSheet } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { useTheme } from '@/ui/theme';

const PRO_FEATURES = [
  'Unlimited accounts, budgets, groups and recurring entries',
  'Cloud sync and backup across phone and web',
  'Smart insights and spending trends',
  'Savings goals and bill reminders',
  'Shared groups where friends use the app too',
  'PDF and Excel reports',
];

export default function Upgrade() {
  const { feature } = useLocalSearchParams<{ feature?: LimitKey }>();
  const t = useTheme();
  const isPro = useStore((s) => s.settings.pro);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <Sheet title="Cashlytix Pro" onClose={closeSheet}>
      {feature && feature in FREE_LIMITS && (
        <T weight="700" color={t.warn} testID="limit-message">
          The free plan includes up to {FREE_LIMITS[feature]} {LIMIT_LABEL[feature]}.
        </T>
      )}
      <View style={{ gap: 12 }}>
        {PRO_FEATURES.map((f) => (
          <View key={f} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="check" size={20} color={t.primary} />
            <T style={{ flex: 1 }}>{f}</T>
          </View>
        ))}
      </View>
      <T size={13} color={t.muted}>
        Payments are not switched on yet. While the app is in testing you can preview Pro for free.
      </T>
      {isPro ? (
        <Button variant="soft" label="Switch Pro preview off" onPress={() => { setSettings({ pro: false }); closeSheet(); }} />
      ) : (
        <Button testID="enable-pro" label="Preview Pro (free while testing)" onPress={() => { setSettings({ pro: true }); closeSheet(); }} />
      )}
      <Button variant="soft" label="Maybe later" onPress={closeSheet} />
    </Sheet>
  );
}
