import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import type { TxnType } from '@/domain/types';
import { sortNewestFirst } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { Chip, Empty, Fab, Header, Reveal, Screen } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { TransactionRow } from '@/ui/TransactionRow';
import { radius, useTheme } from '@/ui/theme';

const FILTERS: { id: TxnType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfers' },
  { id: 'settlement', label: 'Settle ups' },
];

export default function Activity() {
  const t = useTheme();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const friends = useStore((s) => s.friends);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TxnType | 'all'>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNewestFirst(transactions).filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (!q) return true;
      const hay = [
        tx.description,
        categories.find((c) => c.id === tx.categoryId)?.name,
        accounts.find((a) => a.id === tx.accountId)?.name,
        friends.find((f) => f.id === tx.friendId)?.name,
        String(tx.amount / 100),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, categories, accounts, friends, query, filter]);

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<Header title="Activity" />} bottomPad={90}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: t.surface,
            borderRadius: radius.md,
            paddingHorizontal: 14,
          }}>
          <Icon name="search" size={18} color={t.muted} />
          <TextInput
            testID="search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search note, category, account or amount"
            placeholderTextColor={t.faint}
            style={{ flex: 1, paddingVertical: 13, fontSize: 15, color: t.text }}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </ScrollView>
        {rows.length === 0 ? (
          <Empty
            title={transactions.length === 0 ? 'No transactions yet' : 'Nothing matches'}
            hint={transactions.length === 0 ? 'Tap + to add your first one.' : 'Try a different search or filter.'}
          />
        ) : (
          <View>
            {rows.map((tx, i) => (
              <Reveal key={tx.id} index={i}>
                <TransactionRow txn={tx} />
              </Reveal>
            ))}
          </View>
        )}
      </Screen>
      <Fab onPress={() => router.push('/add')} />
    </View>
  );
}
