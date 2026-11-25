import { router } from 'expo-router';
import { Switch, View } from 'react-native';

import { formatDateShort } from '@/domain/dates';
import { formatINR } from '@/domain/money';
import { FREQUENCY_LABEL } from '@/domain/recurring';
import { useStore } from '@/store/useStore';
import { Button, Card, Empty, Header, Pressy, Reveal, Row, Screen, T } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { useTheme } from '@/ui/theme';
import { usePlan } from '@/ui/usePlan';

export default function Recurring() {
  const t = useTheme();
  const { guard } = usePlan();
  const recurring = useStore((s) => s.recurring);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const updateRecurring = useStore((s) => s.updateRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);

  return (
    <Screen header={<Header title="Recurring" subtitle="Rent, EMIs, SIPs, salary" back />}>
      {recurring.length === 0 ? (
        <Empty title="Nothing recurring yet" hint="Add entries that repeat and Cashlytix logs them for you on the due date." />
      ) : (
        recurring.map((r, i) => {
          const name = r.template.description || categories.find((c) => c.id === r.template.categoryId)?.name || (r.template.type === 'income' ? 'Income' : 'Expense');
          return (
            <Reveal key={r.id} index={i}>
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T weight="800" size={16}>
                      {name}
                    </T>
                    <T size={13} color={t.muted}>
                      {FREQUENCY_LABEL[r.frequency]} · {accounts.find((a) => a.id === r.template.accountId)?.name ?? 'Account'}
                    </T>
                    <T size={13} color={t.muted}>
                      {r.active ? `Next: ${formatDateShort(r.nextDate)}` : 'Paused'}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <T weight="800" color={r.template.type === 'income' ? t.income : t.text}>
                      {formatINR(r.template.amount)}
                    </T>
                    <Row style={{ gap: 14 }}>
                      <Switch value={r.active} onValueChange={(v) => updateRecurring(r.id, { active: v })} trackColor={{ true: t.primary }} />
                      <Pressy onPress={() => deleteRecurring(r.id)} accessibilityLabel={`Delete ${name}`} style={{ padding: 4 }}>
                        <Icon name="trash" size={20} color={t.expense} />
                      </Pressy>
                    </Row>
                  </View>
                </Row>
              </Card>
            </Reveal>
          );
        })
      )}
      <Button testID="add-recurring" label="Add recurring entry" onPress={() => guard('recurring', recurring.length, () => router.push('/recurring-form'))} />
    </Screen>
  );
}
