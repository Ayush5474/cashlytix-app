import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatDateShort } from '@/domain/dates';
import { formatINR } from '@/domain/money';
import type { Transaction } from '@/domain/types';
import { useStore } from '@/store/useStore';

import { T } from './components';
import { colors } from './theme';

/** One line in a transaction list; tap to edit. */
export function TransactionRow({ txn }: { txn: Transaction }) {
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);

  const account = accounts.find((a) => a.id === txn.accountId)?.name ?? 'Account';
  const toAccount = accounts.find((a) => a.id === txn.toAccountId)?.name;
  const title =
    txn.type === 'transfer'
      ? `${account} → ${toAccount ?? '?'}`
      : txn.type === 'income'
        ? (txn.description ?? 'Income')
        : (categories.find((c) => c.id === txn.categoryId)?.name ?? 'Expense');
  const sub =
    txn.type === 'expense' && txn.description
      ? `${txn.description} · ${account}`
      : txn.type === 'income'
        ? account
        : txn.type === 'transfer'
          ? (txn.description ?? 'Transfer')
          : account;

  const sign = txn.type === 'income' ? 1 : txn.type === 'expense' ? -1 : 0;
  const color = sign > 0 ? colors.income : sign < 0 ? colors.expense : colors.muted;

  return (
    <Pressable
      testID={`txn-${txn.id}`}
      onPress={() => router.push({ pathname: '/add', params: { id: txn.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        opacity: pressed ? 0.6 : 1,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="700" numberOfLines={1}>
          {title}
        </T>
        <T size={13} color={colors.muted} numberOfLines={1}>
          {sub}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <T weight="800" color={color}>
          {sign === 0 ? formatINR(txn.amount) : formatINR(txn.amount * sign, { sign: true })}
        </T>
        <T size={12} color={colors.muted}>
          {formatDateShort(txn.date)}
        </T>
      </View>
    </Pressable>
  );
}
