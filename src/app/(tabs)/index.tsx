import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PERIOD_OPTIONS, periodFor, type PeriodId } from '@/domain/dates';
import { formatINR } from '@/domain/money';
import { totalBalance } from '@/domain/ledger';
import { needWantSaved, recentTransactions, spendByCategory, summarize } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { Button, Card, Chip, Empty, Fab, Row, Screen, SectionTitle, T, Wrap } from '@/ui/components';
import { Donut, sliceColor } from '@/ui/Donut';
import { Icon } from '@/ui/Icon';
import { TransactionRow } from '@/ui/TransactionRow';
import { colors, groupColor, radius } from '@/ui/theme';

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 4 }}>
      <T size={12} weight="600" color={colors.muted}>
        {label}
      </T>
      <T size={17} weight="800" color={color} numberOfLines={1}>
        {value}
      </T>
    </Card>
  );
}

export default function Dashboard() {
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);

  const [periodId, setPeriodId] = useState<PeriodId>('this_month');
  const [selected, setSelected] = useState<string | null>(null);

  const period = useMemo(() => periodFor(periodId), [periodId]);
  const summary = useMemo(() => summarize(transactions, period), [transactions, period]);
  const byCategory = useMemo(() => spendByCategory(transactions, categories, period), [transactions, categories, period]);
  const nws = useMemo(() => needWantSaved(transactions, categories, period), [transactions, categories, period]);
  const recent = useMemo(() => recentTransactions(transactions, 5), [transactions]);
  const balance = totalBalance(accounts, transactions);

  const goAdd = () => router.push('/add');

  if (accounts.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <Screen>
          <Empty
            title="Welcome to Cashlytix"
            hint="Add an account (cash, bank, wallet or card) and start logging expenses in a few taps."
            action={<Button label="Add your first account" onPress={() => router.push('/account-form')} testID="first-account" />}
          />
        </Screen>
      </View>
    );
  }

  const nwsTotal = nws.need + nws.want + nws.saved;
  const nwsRows = [
    { key: 'need' as const, label: 'Need', value: nws.need },
    { key: 'want' as const, label: 'Want', value: nws.want },
    { key: 'saved' as const, label: 'Saved', value: nws.saved },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomPad={90}>
        <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
          <T size={13} weight="600" color="#CCFBF1">
            Total balance
          </T>
          <T size={32} weight="800" color="#fff">
            {formatINR(balance)}
          </T>
        </Card>

        <Wrap>
          {PERIOD_OPTIONS.map((p) => (
            <Chip key={p.id} label={p.label} selected={periodId === p.id} onPress={() => setPeriodId(p.id)} />
          ))}
        </Wrap>

        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Income" value={formatINR(summary.income)} color={colors.income} />
          <Stat label="Expenses" value={formatINR(summary.expenses)} color={colors.expense} />
          <Stat label="Net" value={formatINR(summary.net, { sign: true })} color={summary.net >= 0 ? colors.income : colors.expense} />
        </Row>

        {transactions.length === 0 ? (
          <Empty title="No transactions yet" hint="Tap the + button to log your first expense." />
        ) : (
          <>
            <Card>
              <SectionTitle>Where it went</SectionTitle>
              {byCategory.length === 0 ? (
                <T color={colors.muted}>No spending in this period.</T>
              ) : (
                <>
                  <Donut data={byCategory} selected={selected} onSelect={setSelected} />
                  <View style={{ gap: 2 }}>
                    {byCategory.map((c, i) => (
                      <Pressable
                        key={c.categoryId}
                        onPress={() => setSelected(selected === c.categoryId ? null : c.categoryId)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 8,
                          paddingHorizontal: 6,
                          borderRadius: radius.sm,
                          backgroundColor: selected === c.categoryId ? colors.bg : 'transparent',
                        }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sliceColor(i) }} />
                        <T style={{ flex: 1 }} weight="600">
                          {c.name}
                        </T>
                        <T color={colors.muted}>{Math.round(c.share * 100)}%</T>
                        <T weight="700" style={{ minWidth: 80, textAlign: 'right' }}>
                          {formatINR(c.amount)}
                        </T>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </Card>

            <Card>
              <SectionTitle>Need · Want · Saved</SectionTitle>
              {nwsTotal === 0 ? (
                <T color={colors.muted}>Nothing to compare yet.</T>
              ) : (
                nwsRows.map((r) => (
                  <View key={r.key} style={{ gap: 6 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T weight="600">{r.label}</T>
                      <T color={colors.muted}>
                        {formatINR(r.value)} · {Math.round((r.value / nwsTotal) * 100)}%
                      </T>
                    </Row>
                    <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: 10,
                          width: `${(r.value / nwsTotal) * 100}%`,
                          backgroundColor: groupColor[r.key],
                          borderRadius: 5,
                        }}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card style={{ gap: 0 }}>
              <SectionTitle
                right={
                  <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                    <Row style={{ gap: 2 }}>
                      <T size={13} weight="700" color={colors.primary}>
                        See all
                      </T>
                      <Icon name="chevron" size={14} color={colors.primary} />
                    </Row>
                  </Pressable>
                }>
                Recent
              </SectionTitle>
              {recent.map((t) => (
                <TransactionRow key={t.id} txn={t} />
              ))}
            </Card>
          </>
        )}
      </Screen>
      <Fab onPress={goAdd}>
        <Icon name="plus" size={28} color="#fff" />
      </Fab>
    </View>
  );
}

