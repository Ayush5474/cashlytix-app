import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import { formatINR } from '@/domain/money';
import { friendActivity, friendBalances } from '@/domain/split';
import { useStore } from '@/store/useStore';
import { Button, Header, Screen, SectionTitle, T } from '@/ui/components';
import { TransactionRow } from '@/ui/TransactionRow';
import { useTheme } from '@/ui/theme';

export default function FriendDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const friends = useStore((s) => s.friends);
  const transactions = useStore((s) => s.transactions);
  const deleteFriend = useStore((s) => s.deleteFriend);
  const [error, setError] = useState<string | null>(null);

  const friend = friends.find((f) => f.id === id);
  const balance = useMemo(() => friendBalances(transactions)[id] ?? 0, [transactions, id]);
  const activity = useMemo(() => friendActivity(transactions, id), [transactions, id]);

  if (!friend) {
    return (
      <Screen header={<Header title="Friend" back />}>
        <T>This friend no longer exists.</T>
      </Screen>
    );
  }

  const message =
    balance > 0
      ? `Hi ${friend.name}, a reminder from Cashlytix: you owe me ${formatINR(balance)}.`
      : balance < 0
        ? `Hi ${friend.name}, from Cashlytix: I owe you ${formatINR(-balance)}.`
        : `Hi ${friend.name}, we are all settled up on Cashlytix.`;

  return (
    <Screen header={<Header title={friend.name} back />}>
      <View style={{ gap: 4 }}>
        <T size={14} weight="600" color={t.muted}>
          {balance > 0 ? `${friend.name} owes you` : balance < 0 ? `You owe ${friend.name}` : 'All settled'}
        </T>
        <T size={38} weight="800" color={balance > 0 ? t.income : balance < 0 ? t.expense : t.text} style={{ letterSpacing: -1 }} testID="friend-balance">
          {formatINR(Math.abs(balance))}
        </T>
      </View>

      <Button label="Settle up" testID="settle-up" onPress={() => router.push({ pathname: '/settle', params: { friendId: friend.id } })} />
      <Button variant="soft" label="Share on WhatsApp" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)} />

      <SectionTitle>History</SectionTitle>
      {activity.length === 0 ? (
        <T color={t.muted}>Nothing shared with {friend.name} yet.</T>
      ) : (
        <View>
          {activity.map((tx) => (
            <TransactionRow key={tx.id} txn={tx} swipe={false} />
          ))}
        </View>
      )}

      {error && <T color={t.expense} weight="600">{error}</T>}
      <Button
        variant="danger"
        label="Remove friend"
        onPress={() => {
          if (deleteFriend(friend.id)) router.replace('/split');
          else setError('This friend appears in bills. Delete those first.');
        }}
      />
    </Screen>
  );
}
