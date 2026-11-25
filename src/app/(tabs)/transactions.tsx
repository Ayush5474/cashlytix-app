import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { sortNewestFirst } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { Card, Chip, Empty, Fab, Screen, Wrap } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { TransactionRow } from '@/ui/TransactionRow';
import { colors, radius } from '@/ui/theme';
import type { TxnType } from '@/domain/types';

const FILTERS: { id: TxnType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfers' },
];

export default function Transactions() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TxnType | 'all'>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNewestFirst(transactions).filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (!q) return true;
      const hay = [
        t.description,
        categories.find((c) => c.id === t.categoryId)?.name,
        accounts.find((a) => a.id === t.accountId)?.name,
        String(t.amount / 100),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, categories, accounts, query, filter]);

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomPad={90}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: 12,
          }}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            testID="search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search note, category, account or amount"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text }}
          />
        </View>
        <Wrap>
          {FILTERS.map((f) => (
            <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </Wrap>
        {rows.length === 0 ? (
          <Empty
            title={transactions.length === 0 ? 'No transactions yet' : 'Nothing matches'}
            hint={transactions.length === 0 ? 'Tap + to add your first one.' : 'Try a different search or filter.'}
          />
        ) : (
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {rows.map((t) => (
              <TransactionRow key={t.id} txn={t} />
            ))}
          </Card>
        )}
      </Screen>
      <Fab onPress={() => router.push('/add')}>
        <Icon name="plus" size={28} color="#fff" />
      </Fab>
    </View>
  );
}
