import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INVESTMENT_CATEGORY_ID, INVESTMENT_KINDS, INVESTMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from '@/domain/defaults';
import { addDaysISO, formatDateShort, isValidISO, todayISO } from '@/domain/dates';
import { formatINR, formatTypedAmount, parseAmountToPaise, pressKey, type PadKey } from '@/domain/money';
import { categoriesByUsage } from '@/domain/selectors';
import type { InvestmentKind, NeedWant, NewTransaction, PaymentMethod, TxnType } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, Row, Screen, Segmented, T, Wrap } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { NumberPad } from '@/ui/NumberPad';
import { colors, radius } from '@/ui/theme';

const TYPE_OPTIONS: { id: TxnType; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
];
const TYPE_COLOR: Record<TxnType, string> = {
  expense: colors.expense,
  income: colors.income,
  transfer: colors.primary,
};

const Label = ({ children }: { children: string }) => (
  <T size={12} weight="700" color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
    {children}
  </T>
);

export default function AddTransaction() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const lastAccountId = useStore((s) => s.lastAccountId);
  const lastMethod = useStore((s) => s.lastMethod);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);

  const editing = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);

  const defaultAccount =
    accounts.find((a) => a.id === lastAccountId)?.id ?? accounts[0]?.id ?? '';

  const [type, setType] = useState<TxnType>(editing?.type ?? 'expense');
  const [amountText, setAmountText] = useState(editing ? String(editing.amount / 100) : '');
  const [categoryId, setCategoryId] = useState<string | undefined>(editing?.categoryId);
  const [accountId, setAccountId] = useState(editing?.accountId ?? defaultAccount);
  const [toAccountId, setToAccountId] = useState<string | undefined>(editing?.toAccountId);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [needWant, setNeedWant] = useState<NeedWant | undefined>(editing?.needWant);
  const [method, setMethod] = useState<PaymentMethod | undefined>(editing?.paymentMethod);
  const [investmentKind, setInvestmentKind] = useState<InvestmentKind | undefined>(editing?.investmentKind);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedCategories = useMemo(() => categoriesByUsage(categories, transactions), [categories, transactions]);
  const amount = parseAmountToPaise(amountText);
  const isInvestment = type === 'expense' && categoryId === INVESTMENT_CATEGORY_ID;

  if (id && !editing) {
    return (
      <Screen>
        <T>This transaction no longer exists.</T>
        <Button label="Close" onPress={() => router.back()} />
      </Screen>
    );
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const save = () => {
    const effectiveMethod =
      type === 'expense'
        ? accounts.find((a) => a.id === accountId)?.type === 'credit_card'
          ? 'credit_card'
          : (method ?? lastMethod)
        : undefined;

    const draft: NewTransaction = {
      type,
      amount,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'expense' ? categoryId : undefined,
      description: description.trim() || undefined,
      paymentMethod: effectiveMethod,
      needWant: type === 'expense' ? needWant : undefined,
      investmentKind: isInvestment ? investmentKind : undefined,
      date,
    };
    const err = editing ? updateTransaction(editing.id, draft) : addTransaction(draft);
    if (err) setError(err);
    else close();
  };

  const remove = () => {
    if (!editing) return;
    deleteTransaction(editing.id);
    close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen bottomPad={90}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={close} accessibilityLabel="Close" hitSlop={12}>
            <Icon name="close" />
          </Pressable>
          <T size={17} weight="800">
            {editing ? 'Edit transaction' : 'Add transaction'}
          </T>
          {editing ? (
            <Pressable onPress={remove} accessibilityLabel="Delete transaction" hitSlop={12} testID="delete-txn">
              <Icon name="trash" color={colors.expense} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </Row>

        <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} colorFor={(k) => TYPE_COLOR[k]} />

        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <T size={44} weight="800" color={amount > 0 ? TYPE_COLOR[type] : '#94A3B8'}>
            ₹{formatTypedAmount(amountText)}
          </T>
        </View>

        {accounts.length === 0 ? (
          <View style={{ gap: 10 }}>
            <T color={colors.muted}>Add an account first so this money has somewhere to come from.</T>
            <Button label="Add account" onPress={() => router.push('/account-form')} />
          </View>
        ) : (
          <>
            {type === 'expense' && (
              <View style={{ gap: 8 }}>
                <Label>Category</Label>
                <Wrap>
                  {orderedCategories.map((c) => (
                    <Chip
                      key={c.id}
                      testID={`cat-${c.id}`}
                      label={c.name}
                      selected={categoryId === c.id}
                      onPress={() => setCategoryId(c.id)}
                    />
                  ))}
                </Wrap>
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Label>{type === 'income' ? 'Into account' : type === 'transfer' ? 'From account' : 'Paid from'}</Label>
              <Wrap>
                {accounts.map((a) => (
                  <Chip
                    key={a.id}
                    testID={`acct-${a.name}`}
                    label={a.name}
                    selected={accountId === a.id}
                    onPress={() => setAccountId(a.id)}
                  />
                ))}
              </Wrap>
            </View>

            {type === 'transfer' && (
              <View style={{ gap: 8 }}>
                <Label>Send to</Label>
                <Wrap>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <Chip
                        key={a.id}
                        testID={`to-${a.name}`}
                        label={a.name}
                        selected={toAccountId === a.id}
                        onPress={() => setToAccountId(a.id)}
                      />
                    ))}
                </Wrap>
              </View>
            )}
          </>
        )}

        <NumberPad onKey={(k: PadKey) => setAmountText((cur) => pressKey(cur, k))} />

        <Pressable onPress={() => setMore((m) => !m)} testID="toggle-more" style={{ alignSelf: 'center', padding: 6 }}>
          <Row style={{ gap: 6 }}>
            <T size={14} weight="700" color={colors.primary}>
              {more ? 'Fewer details' : 'More details'}
            </T>
            <Icon name="chevronDown" size={16} color={colors.primary} />
          </Row>
        </Pressable>

        {more && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Label>Note</Label>
              <TextInput
                testID="input-note"
                value={description}
                onChangeText={setDescription}
                placeholder="What was it for?"
                placeholderTextColor="#94A3B8"
                style={inputStyle}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>Date</Label>
              <Wrap>
                <Chip label="Today" selected={date === todayISO()} onPress={() => setDate(todayISO())} />
                <Chip
                  label="Yesterday"
                  selected={date === addDaysISO(todayISO(), -1)}
                  onPress={() => setDate(addDaysISO(todayISO(), -1))}
                />
              </Wrap>
              <TextInput
                testID="input-date"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[inputStyle, !isValidISO(date) && { borderColor: colors.expense }]}
              />
              {isValidISO(date) && <T size={12} color={colors.muted}>{formatDateShort(date)}</T>}
            </View>

            {type === 'expense' && (
              <>
                <View style={{ gap: 8 }}>
                  <Label>Need or want</Label>
                  <Wrap>
                    {(['need', 'want'] as NeedWant[]).map((n) => (
                      <Chip
                        key={n}
                        label={n === 'need' ? 'Need' : 'Want'}
                        selected={needWant === n}
                        onPress={() => setNeedWant(needWant === n ? undefined : n)}
                        color={n === 'need' ? colors.need : colors.want}
                      />
                    ))}
                  </Wrap>
                </View>
                <View style={{ gap: 8 }}>
                  <Label>Payment method</Label>
                  <Wrap>
                    {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                      <Chip
                        key={m}
                        label={PAYMENT_METHOD_LABEL[m]}
                        selected={method === m}
                        onPress={() => setMethod(method === m ? undefined : m)}
                      />
                    ))}
                  </Wrap>
                </View>
              </>
            )}

            {isInvestment && (
              <View style={{ gap: 8 }}>
                <Label>Invested in</Label>
                <Wrap>
                  {INVESTMENT_KINDS.map((k) => (
                    <Chip
                      key={k}
                      label={INVESTMENT_KIND_LABEL[k]}
                      selected={investmentKind === k}
                      onPress={() => setInvestmentKind(investmentKind === k ? undefined : k)}
                    />
                  ))}
                </Wrap>
              </View>
            )}
          </View>
        )}

        {error && (
          <T color={colors.expense} weight="600">
            {error}
          </T>
        )}
      </Screen>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 10,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <View style={{ width: '100%', maxWidth: 720, paddingHorizontal: 16 }}>
          <Button
            testID="save-txn"
            label={amount > 0 ? `Save ${formatINR(amount)}` : 'Save'}
            onPress={save}
            disabled={amount <= 0}
          />
        </View>
      </View>
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.text,
} as const;
