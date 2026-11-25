import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { monthBudgets } from '@/domain/budgets';
import { PERIOD_OPTIONS, periodFor, type PeriodId } from '@/domain/dates';
import { totalBalance } from '@/domain/ledger';
import { formatINR } from '@/domain/money';
import { needWantSaved, recentTransactions, spendByCategory, summarize } from '@/domain/selectors';
import { friendBalances, splitTotals } from '@/domain/split';
import { useStore } from '@/store/useStore';
import { Button, Card, Chip, Empty, Fab, Header, Reveal, Row, Screen, SectionTitle, T } from '@/ui/components';
import { Donut, sliceColor } from '@/ui/Donut';
import { Icon } from '@/ui/Icon';
import { useCountUp, useProgress } from '@/ui/motion';
import { TransactionRow } from '@/ui/TransactionRow';
import { groupColor, radius, useTheme } from '@/ui/theme';

function Bar({ ratio, color, height = 8 }: { ratio: number; color: string; height?: number }) {
  const t = useTheme();
  const p = useProgress(ratio, 700);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: t.track, overflow: 'hidden' }}>
      <View style={{ height, width: `${Math.min(ratio, 1) * p * 100}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export default function Dashboard() {
  const t = useTheme();
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const friends = useStore((s) => s.friends);
  const monthlyBudget = useStore((s) => s.monthlyBudget);
  const addAccount = useStore((s) => s.addAccount);

  const [periodId, setPeriodId] = useState<PeriodId>('this_month');
  const [selected, setSelected] = useState<string | null>(null);

  const period = useMemo(() => periodFor(periodId), [periodId]);
  const summary = useMemo(() => summarize(transactions, period), [transactions, period]);
  const byCategory = useMemo(() => spendByCategory(transactions, categories, period), [transactions, categories, period]);
  const nws = useMemo(() => needWantSaved(transactions, categories, period), [transactions, categories, period]);
  const recent = useMemo(() => recentTransactions(transactions, 5), [transactions]);
  const budgets = useMemo(() => monthBudgets(transactions, categories, monthlyBudget), [transactions, categories, monthlyBudget]);
  const split = useMemo(() => splitTotals(friendBalances(transactions)), [transactions]);
  const balance = useCountUp(totalBalance(accounts, transactions));

  const goAdd = () => router.push('/add');

  if (accounts.length === 0) {
    return (
      <Screen header={<Header title="Cashlytix" />}>
        <Empty
          title="Welcome to Cashlytix"
          hint="Add an account (cash, bank, wallet or card) and start logging expenses in a few taps."
          action={
            <View style={{ gap: 10, alignSelf: 'stretch' }}>
              <Button label="Add your first account" onPress={() => router.push('/account-form')} testID="first-account" />
              <Button
                variant="soft"
                label="Just start with Cash"
                testID="start-cash"
                onPress={() => addAccount({ name: 'Cash', type: 'cash', openingBalance: 0, includeInTotal: true })}
              />
            </View>
          }
        />
      </Screen>
    );
  }

  const nwsTotal = nws.need + nws.want + nws.saved;
  const nwsRows = [
    { key: 'need' as const, label: 'Need', value: nws.need },
    { key: 'want' as const, label: 'Want', value: nws.want },
    { key: 'saved' as const, label: 'Saved', value: nws.saved },
  ];
  const levelColor = (l: 'ok' | 'warn' | 'over') => (l === 'over' ? t.expense : l === 'warn' ? t.warn : t.primary);
  const hasBudgets = !!budgets.overall || budgets.categories.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<Header title="Cashlytix" />} bottomPad={90}>
        <Reveal>
          <View style={{ gap: 4 }}>
            <T size={14} weight="600" color={t.muted}>
              Total balance
            </T>
            <T size={42} weight="800" style={{ letterSpacing: -1 }}>
              {formatINR(balance)}
            </T>
            <T size={14} weight="700" color={summary.net >= 0 ? t.income : t.expense}>
              {formatINR(summary.net, { sign: true })}{' '}
              <T size={14} color={t.muted}>
                {PERIOD_OPTIONS.find((p) => p.id === periodId)?.label.toLowerCase()}
              </T>
            </T>
          </View>
        </Reveal>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PERIOD_OPTIONS.map((p) => (
            <Chip key={p.id} label={p.label} selected={periodId === p.id} onPress={() => setPeriodId(p.id)} />
          ))}
        </ScrollView>

        <Reveal index={1}>
          <Row style={{ alignItems: 'stretch' }}>
            <Card style={{ flex: 1, gap: 4 }}>
              <T size={13} weight="600" color={t.muted}>
                Income
              </T>
              <T size={19} weight="800" color={t.income} numberOfLines={1}>
                {formatINR(summary.income)}
              </T>
            </Card>
            <Card style={{ flex: 1, gap: 4 }}>
              <T size={13} weight="600" color={t.muted}>
                Spent
              </T>
              <T size={19} weight="800" numberOfLines={1}>
                {formatINR(summary.expenses)}
              </T>
            </Card>
          </Row>
        </Reveal>

        {transactions.length === 0 ? (
          <Empty title="No transactions yet" hint="Tap the + button to log your first expense." />
        ) : (
          <>
            <Reveal index={2}>
              <Card>
                <SectionTitle
                  right={
                    <Pressable onPress={() => router.push('/budgets')} hitSlop={8}>
                      <T size={13} weight="700" color={t.primary}>
                        {hasBudgets ? 'Edit' : 'Set up'}
                      </T>
                    </Pressable>
                  }>
                  Budget this month
                </SectionTitle>
                {!hasBudgets ? (
                  <T color={t.muted}>Set a monthly budget to see how much you have left to spend.</T>
                ) : (
                  <>
                    {budgets.overall && (
                      <View style={{ gap: 8 }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T weight="700">{formatINR(Math.max(budgets.overall.limit - budgets.overall.spent, 0))} left</T>
                          <T color={t.muted}>
                            {formatINR(budgets.overall.spent)} of {formatINR(budgets.overall.limit)}
                          </T>
                        </Row>
                        <Bar ratio={budgets.overall.ratio} color={levelColor(budgets.overall.level)} height={10} />
                        {budgets.overall.level === 'over' && (
                          <T size={13} weight="600" color={t.expense}>
                            Over budget by {formatINR(budgets.overall.spent - budgets.overall.limit)}
                          </T>
                        )}
                      </View>
                    )}
                    {budgets.categories.map((b) => (
                      <View key={b.id} style={{ gap: 6 }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T weight="600">{b.name}</T>
                          <T size={13} color={b.level === 'ok' ? t.muted : levelColor(b.level)} weight={b.level === 'ok' ? '400' : '700'}>
                            {formatINR(b.spent)} / {formatINR(b.limit)}
                          </T>
                        </Row>
                        <Bar ratio={b.ratio} color={levelColor(b.level)} />
                      </View>
                    ))}
                  </>
                )}
              </Card>
            </Reveal>

            <Reveal index={3}>
              <Card>
                <SectionTitle>Where it went</SectionTitle>
                {byCategory.length === 0 ? (
                  <T color={t.muted}>No spending in this period.</T>
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
                            paddingHorizontal: 8,
                            borderRadius: radius.sm,
                            backgroundColor: selected === c.categoryId ? t.track : 'transparent',
                          }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sliceColor(i) }} />
                          <T style={{ flex: 1 }} weight="600">
                            {c.name}
                          </T>
                          <T color={t.muted}>{Math.round(c.share * 100)}%</T>
                          <T weight="700" style={{ minWidth: 84, textAlign: 'right' }}>
                            {formatINR(c.amount)}
                          </T>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </Card>
            </Reveal>

            <Reveal index={4}>
              <Card>
                <SectionTitle>Need · Want · Saved</SectionTitle>
                {nwsTotal === 0 ? (
                  <T color={t.muted}>Nothing to compare yet.</T>
                ) : (
                  nwsRows.map((r) => (
                    <View key={r.key} style={{ gap: 6 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <T weight="600">{r.label}</T>
                        <T color={t.muted}>
                          {formatINR(r.value)} · {Math.round((r.value / nwsTotal) * 100)}%
                        </T>
                      </Row>
                      <Bar ratio={r.value / nwsTotal} color={groupColor(t, r.key)} height={10} />
                    </View>
                  ))
                )}
              </Card>
            </Reveal>

            <Reveal index={5}>
              <Pressable onPress={() => router.push('/split')}>
                <Card>
                  <SectionTitle>Split</SectionTitle>
                  {friends.length === 0 ? (
                    <T color={t.muted}>Share a bill with friends and keep track of who owes what.</T>
                  ) : (
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View>
                        <T size={12} color={t.muted}>
                          You are owed
                        </T>
                        <T size={18} weight="800" color={t.income}>
                          {formatINR(split.owedToMe)}
                        </T>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T size={12} color={t.muted}>
                          You owe
                        </T>
                        <T size={18} weight="800" color={split.iOwe > 0 ? t.expense : t.text}>
                          {formatINR(split.iOwe)}
                        </T>
                      </View>
                    </Row>
                  )}
                </Card>
              </Pressable>
            </Reveal>

            <Reveal index={6}>
              <View>
                <SectionTitle
                  right={
                    <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                      <Row style={{ gap: 2 }}>
                        <T size={13} weight="700" color={t.primary}>
                          See all
                        </T>
                        <Icon name="chevron" size={14} color={t.primary} />
                      </Row>
                    </Pressable>
                  }>
                  Recent
                </SectionTitle>
                {recent.map((tx) => (
                  <TransactionRow key={tx.id} txn={tx} />
                ))}
              </View>
            </Reveal>
          </>
        )}
      </Screen>
      <Fab onPress={goAdd} />
    </View>
  );
}
