import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { formatINR, parseAmountToPaise } from '@/domain/money';
import { friendBalances } from '@/domain/split';
import { todayISO } from '@/domain/dates';
import { useStore } from '@/store/useStore';
import { Button, Chip, Field, Label, Segmented, Sheet, T, Wrap, closeSheet } from '@/ui/components';
import { haptic } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

type Dir = 'received' | 'paid';

/** Record money changing hands with a friend. Neither income nor an expense. */
export default function Settle() {
  const { id, friendId: friendParam } = useLocalSearchParams<{ id?: string; friendId?: string }>();
  const t = useTheme();
  const accounts = useStore((s) => s.accounts);
  const friends = useStore((s) => s.friends);
  const transactions = useStore((s) => s.transactions);
  const lastAccountId = useStore((s) => s.lastAccountId);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);

  const editing = transactions.find((x) => x.id === id && x.type === 'settlement');
  const friendId = editing?.friendId ?? friendParam ?? '';
  const friend = friends.find((f) => f.id === friendId);
  const balance = useMemo(() => friendBalances(transactions)[friendId] ?? 0, [transactions, friendId]);

  // Suggest settling the full balance: they pay you when they owe you, otherwise you pay them.
  const [direction, setDirection] = useState<Dir>(editing?.settleDirection ?? (balance < 0 ? 'paid' : 'received'));
  const [amountText, setAmountText] = useState(editing ? String(editing.amount / 100) : balance !== 0 ? String(Math.abs(balance) / 100) : '');
  const [accountId, setAccountId] = useState(editing?.accountId ?? accounts.find((a) => a.id === lastAccountId)?.id ?? accounts[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!friend) {
    return (
      <Sheet title="Settle up" onClose={closeSheet}>
        <T>Friend not found.</T>
      </Sheet>
    );
  }

  const save = () => {
    const draft = {
      type: 'settlement' as const,
      amount: parseAmountToPaise(amountText),
      accountId,
      friendId,
      settleDirection: direction,
      date: editing?.date ?? todayISO(),
      description: undefined,
    };
    const err = editing ? updateTransaction(editing.id, draft) : addTransaction(draft);
    if (err) setError(err);
    else {
      haptic('success');
      closeSheet();
    }
  };

  return (
    <Sheet title={`Settle up with ${friend.name}`} onClose={closeSheet} footer={<Button testID="save-settle" label="Save" onPress={save} />}>
      <T color={t.muted}>
        {balance > 0
          ? `${friend.name} owes you ${formatINR(balance)}.`
          : balance < 0
            ? `You owe ${friend.name} ${formatINR(-balance)}.`
            : `You and ${friend.name} are all settled.`}
      </T>
      <Segmented
        options={[
          { id: 'received' as Dir, label: `${friend.name} paid me` },
          { id: 'paid' as Dir, label: `I paid ${friend.name}` },
        ]}
        value={direction}
        onChange={setDirection}
      />
      <Field testID="settle-amount" label="Amount (₹)" value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0" />
      <View style={{ gap: 8 }}>
        <Label>{direction === 'received' ? 'Received into' : 'Paid from'}</Label>
        <Wrap>
          {accounts.map((a) => (
            <Chip key={a.id} testID={`settle-acct-${a.name}`} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
          ))}
        </Wrap>
      </View>
      {error && <T color={t.expense} weight="600">{error}</T>}
      {editing && (
        <Button
          label="Delete this settle up"
          variant="danger"
          onPress={() => {
            deleteTransaction(editing.id);
            closeSheet();
          }}
        />
      )}
    </Sheet>
  );
}
