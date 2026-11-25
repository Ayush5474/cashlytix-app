import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { formatINR } from '@/domain/money';
import { groupSummary } from '@/domain/split';
import { useStore } from '@/store/useStore';
import { Button, Card, Header, Row, Screen, SectionTitle, T } from '@/ui/components';
import { TransactionRow } from '@/ui/TransactionRow';
import { useTheme } from '@/ui/theme';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const groups = useStore((s) => s.groups);
  const friends = useStore((s) => s.friends);
  const transactions = useStore((s) => s.transactions);

  const group = groups.find((g) => g.id === id);
  const summary = useMemo(() => groupSummary(transactions, id), [transactions, id]);

  if (!group) {
    return (
      <Screen header={<Header title="Group" back />}>
        <T>This group no longer exists.</T>
      </Screen>
    );
  }

  return (
    <Screen header={<Header title={group.name} subtitle={`${group.memberIds.length + 1} people`} back />}>
      <View style={{ gap: 4 }}>
        <T size={14} weight="600" color={t.muted}>
          Total spent together
        </T>
        <T size={38} weight="800" style={{ letterSpacing: -1 }} testID="group-total">
          {formatINR(summary.total)}
        </T>
      </View>

      <Card>
        <SectionTitle>Balances</SectionTitle>
        {group.memberIds.map((mid) => {
          const b = summary.balances[mid] ?? 0;
          return (
            <Row key={mid} style={{ justifyContent: 'space-between' }}>
              <T weight="600">{friends.find((f) => f.id === mid)?.name ?? 'Friend'}</T>
              <T weight="700" color={b > 0 ? t.income : b < 0 ? t.expense : t.muted}>
                {b > 0 ? `owes you ${formatINR(b)}` : b < 0 ? `you owe ${formatINR(-b)}` : 'settled'}
              </T>
            </Row>
          );
        })}
      </Card>

      <Button label="Add a bill" onPress={() => router.push('/add')} />
      <Button variant="soft" label="Edit group" onPress={() => router.push({ pathname: '/group-form', params: { id: group.id } })} />

      <SectionTitle>Bills</SectionTitle>
      {summary.transactions.length === 0 ? (
        <T color={t.muted}>No bills in this group yet. Add an expense, switch on “Split with friends” and pick this group.</T>
      ) : (
        <View>
          {summary.transactions.map((tx) => (
            <TransactionRow key={tx.id} txn={tx} swipe={false} />
          ))}
        </View>
      )}
    </Screen>
  );
}
