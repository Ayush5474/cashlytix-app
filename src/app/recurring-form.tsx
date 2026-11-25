import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { todayISO, isValidISO } from '@/domain/dates';
import { parseAmountToPaise } from '@/domain/money';
import { FREQUENCY_LABEL } from '@/domain/recurring';
import type { Frequency, TxnType } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, Field, Label, Segmented, Sheet, T, Wrap, closeSheet } from '@/ui/components';
import { showToast } from '@/ui/toast';
import { useTheme } from '@/ui/theme';

export default function RecurringForm() {
  const t = useTheme();
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const lastAccountId = useStore((s) => s.lastAccountId);
  const addRecurring = useStore((s) => s.addRecurring);
  const applyRecurring = useStore((s) => s.applyRecurring);

  const [type, setType] = useState<Extract<TxnType, 'expense' | 'income'>>('expense');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [accountId, setAccountId] = useState(accounts.find((a) => a.id === lastAccountId)?.id ?? accounts[0]?.id ?? '');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [start, setStart] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const amount = parseAmountToPaise(amountText);
    if (amount <= 0) return setError('Enter an amount.');
    if (!accountId) return setError('Choose an account.');
    if (type === 'expense' && !categoryId) return setError('Choose a category.');
    if (!isValidISO(start)) return setError('Enter the start date as YYYY-MM-DD.');
    addRecurring({
      template: {
        type,
        amount,
        accountId,
        categoryId: type === 'expense' ? categoryId : undefined,
        description: note.trim() || undefined,
      },
      frequency,
      anchorDay: Number(start.slice(8, 10)),
      nextDate: start,
      active: true,
    });
    const added = applyRecurring();
    if (added > 0) showToast(`Logged ${added} due ${added === 1 ? 'entry' : 'entries'} now`);
    closeSheet();
  };

  return (
    <Sheet title="New recurring entry" onClose={closeSheet} footer={<Button testID="save-recurring" label="Save" onPress={save} />}>
      {accounts.length === 0 ? (
        <View style={{ gap: 10 }}>
          <T color={t.muted}>Add an account first.</T>
          <Button label="Add account" onPress={() => router.push('/account-form')} />
        </View>
      ) : (
        <>
          <Segmented
            options={[
              { id: 'expense' as const, label: 'Expense' },
              { id: 'income' as const, label: 'Income' },
            ]}
            value={type}
            onChange={setType}
            colorFor={(k) => (k === 'expense' ? t.expense : t.income)}
          />
          <Field testID="rec-amount" label="Amount (₹)" value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0" />
          <Field testID="rec-note" label="Name" value={note} onChangeText={setNote} placeholder="e.g. House rent" />
          {type === 'expense' && (
            <View style={{ gap: 8 }}>
              <Label>Category</Label>
              <Wrap>
                {categories.map((c) => (
                  <Chip key={c.id} testID={`rec-cat-${c.id}`} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
                ))}
              </Wrap>
            </View>
          )}
          <View style={{ gap: 8 }}>
            <Label>Account</Label>
            <Wrap>
              {accounts.map((a) => (
                <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
              ))}
            </Wrap>
          </View>
          <View style={{ gap: 8 }}>
            <Label>Repeats</Label>
            <Wrap>
              {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                <Chip key={f} testID={`freq-${f}`} label={FREQUENCY_LABEL[f]} selected={frequency === f} onPress={() => setFrequency(f)} />
              ))}
            </Wrap>
          </View>
          <Field testID="rec-start" label="First date" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          {error && <T color={t.expense} weight="600">{error}</T>}
        </>
      )}
    </Sheet>
  );
}
