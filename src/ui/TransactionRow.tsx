import { router } from 'expo-router';
import { View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { formatDateShort } from '@/domain/dates';
import { formatINR } from '@/domain/money';
import { effectiveExpense } from '@/domain/split';
import type { Transaction } from '@/domain/types';
import { useStore } from '@/store/useStore';

import { Pressy, T } from './components';
import { Icon } from './Icon';
import { showToast } from './toast';
import { useTheme } from './theme';

/** One line in a transaction list. Tap to edit; swipe left to delete (with Undo). */
export function TransactionRow({ txn, swipe = true }: { txn: Transaction; swipe?: boolean }) {
  const t = useTheme();
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const friends = useStore((s) => s.friends);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);

  const friendName = (id?: string) => friends.find((f) => f.id === id)?.name ?? 'Friend';
  const account = accounts.find((a) => a.id === txn.accountId)?.name;
  const toAccount = accounts.find((a) => a.id === txn.toAccountId)?.name;
  const paidByFriend = !!txn.split && txn.split.payer !== 'me';

  let title: string;
  let sub: string;
  let amount: number;
  let sign: 1 | -1 | 0;

  if (txn.type === 'settlement') {
    const received = txn.settleDirection === 'received';
    title = received ? `${friendName(txn.friendId)} paid you` : `You paid ${friendName(txn.friendId)}`;
    sub = `Settle up · ${account ?? 'Account'}`;
    amount = txn.amount;
    sign = received ? 1 : -1;
  } else if (txn.type === 'transfer') {
    title = `${account ?? '?'} → ${toAccount ?? '?'}`;
    sub = txn.description ?? 'Transfer';
    amount = txn.amount;
    sign = 0;
  } else if (txn.type === 'income') {
    title = txn.description ?? 'Income';
    sub = account ?? 'Account';
    amount = txn.amount;
    sign = 1;
  } else {
    const cat = categories.find((c) => c.id === txn.categoryId)?.name ?? 'Expense';
    title = cat;
    amount = effectiveExpense(txn);
    sign = -1;
    if (txn.split) {
      const who = paidByFriend ? `${friendName(txn.split.payer)} paid` : (account ?? 'You paid');
      sub = `${txn.description ? `${txn.description} · ` : ''}Split · ${who} ${formatINR(txn.amount)}`;
    } else {
      sub = txn.description ? `${txn.description} · ${account ?? ''}` : (account ?? '');
    }
  }

  const color = sign > 0 ? t.income : sign < 0 ? t.text : t.muted;

  const remove = () => {
    const removed = deleteTransaction(txn.id);
    if (removed) showToast('Transaction deleted', { label: 'Undo', onPress: () => restoreTransaction(removed) });
  };

  const row = (
    <Pressy
      testID={`txn-${txn.id}`}
      onPress={() => router.push({ pathname: '/add', params: { id: txn.id } })}
      scaleTo={0.985}
      buzz={false}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        backgroundColor: t.bg,
      }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="700" numberOfLines={1}>
          {title}
        </T>
        <T size={13} color={t.muted} numberOfLines={1}>
          {sub}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <T weight="800" color={color}>
          {sign === 0 ? formatINR(amount) : formatINR(amount * sign, { sign: true })}
        </T>
        <T size={12} color={t.muted}>
          {formatDateShort(txn.date)}
        </T>
      </View>
    </Pressy>
  );

  if (!swipe) return row;
  return (
    <ReanimatedSwipeable
      overshootRight={false}
      rightThreshold={72}
      onSwipeableOpen={(direction) => {
        if (direction === 'right' || direction === 'left') remove();
      }}
      renderRightActions={() => (
        <View style={{ width: 88, backgroundColor: t.expense, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trash" color="#fff" />
        </View>
      )}>
      {row}
    </ReanimatedSwipeable>
  );
}
