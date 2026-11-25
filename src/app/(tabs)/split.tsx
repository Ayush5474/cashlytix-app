import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { formatINR } from '@/domain/money';
import { friendBalances, groupSummary, splitTotals } from '@/domain/split';
import { useStore } from '@/store/useStore';
import { Button, Card, Empty, Header, Pressy, Reveal, Row, Screen, SectionTitle, T } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { useCountUp } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { usePlan } from '@/ui/usePlan';

export default function SplitTab() {
  const t = useTheme();
  const { guard } = usePlan();
  const friends = useStore((s) => s.friends);
  const groups = useStore((s) => s.groups);
  const transactions = useStore((s) => s.transactions);

  const balances = useMemo(() => friendBalances(transactions), [transactions]);
  const totals = splitTotals(balances);
  const owed = useCountUp(totals.owedToMe);
  const owe = useCountUp(totals.iOwe);

  return (
    <Screen
      header={
        <Header
          title="Split"
          right={
            <Pressy onPress={() => router.push('/friend-form')} testID="add-friend" accessibilityLabel="Add friend" style={{ padding: 8 }}>
              <Icon name="plus" color={t.primary} />
            </Pressy>
          }
        />
      }>
      <Reveal>
        <Row style={{ alignItems: 'stretch' }}>
          <Card style={{ flex: 1, gap: 4 }}>
            <T size={13} weight="600" color={t.muted}>
              You are owed
            </T>
            <T size={22} weight="800" color={t.income} testID="owed-total">
              {formatINR(owed)}
            </T>
          </Card>
          <Card style={{ flex: 1, gap: 4 }}>
            <T size={13} weight="600" color={t.muted}>
              You owe
            </T>
            <T size={22} weight="800" color={totals.iOwe > 0 ? t.expense : t.text} testID="owe-total">
              {formatINR(owe)}
            </T>
          </Card>
        </Row>
      </Reveal>

      <SectionTitle
        right={
          <Pressy
            testID="new-group"
            onPress={() => guard('groups', groups.length, () => router.push('/group-form'))}
            style={{ paddingVertical: 4 }}>
            <T size={13} weight="700" color={t.primary}>
              New group
            </T>
          </Pressy>
        }>
        Groups
      </SectionTitle>
      {groups.length === 0 ? (
        <T color={t.muted}>Make a group for a trip or a flat to see its running total.</T>
      ) : (
        groups.map((g, i) => {
          const s = groupSummary(transactions, g.id);
          return (
            <Reveal key={g.id} index={i}>
              <Pressy testID={`group-${g.name}`} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })} scaleTo={0.985}>
                <Card>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T weight="800" size={16}>
                        {g.name}
                      </T>
                      <T size={13} color={t.muted}>
                        {g.memberIds.length + 1} people · {s.count} {s.count === 1 ? 'bill' : 'bills'}
                      </T>
                    </View>
                    <T weight="800">{formatINR(s.total)}</T>
                  </Row>
                </Card>
              </Pressy>
            </Reveal>
          );
        })
      )}

      <SectionTitle>Friends</SectionTitle>
      {friends.length === 0 ? (
        <Empty
          title="No friends yet"
          hint="Add a friend, then use “Split with friends” when you add an expense."
          action={<Button label="Add a friend" onPress={() => router.push('/friend-form')} testID="empty-add-friend" />}
        />
      ) : (
        friends.map((f, i) => {
          const b = balances[f.id] ?? 0;
          return (
            <Reveal key={f.id} index={i}>
              <Pressy
                testID={`friend-${f.name}`}
                onPress={() => router.push({ pathname: '/friend/[id]', params: { id: f.id } })}
                scaleTo={0.985}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <View
                  style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <T weight="800" color={t.primary}>
                    {f.name.charAt(0).toUpperCase()}
                  </T>
                </View>
                <T weight="700" style={{ flex: 1 }}>
                  {f.name}
                </T>
                <View style={{ alignItems: 'flex-end' }}>
                  <T size={12} color={t.muted}>
                    {b > 0 ? 'owes you' : b < 0 ? 'you owe' : 'settled'}
                  </T>
                  {b !== 0 && (
                    <T weight="800" color={b > 0 ? t.income : t.expense}>
                      {formatINR(Math.abs(b))}
                    </T>
                  )}
                </View>
              </Pressy>
            </Reveal>
          );
        })
      )}
    </Screen>
  );
}
