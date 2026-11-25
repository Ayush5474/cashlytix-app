import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';

import { addDaysISO, formatDateShort, isValidISO, todayISO } from '@/domain/dates';
import { INVESTMENT_CATEGORY_ID, INVESTMENT_KINDS, INVESTMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from '@/domain/defaults';
import { formatINR, formatTypedAmount, parseAmountToPaise, pressKey, type PadKey } from '@/domain/money';
import { categoriesByUsage } from '@/domain/selectors';
import { ME, computeShares, type SplitMethod } from '@/domain/split';
import type { InvestmentKind, NeedWant, NewTransaction, PaymentMethod, TxnType } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, Field, Label, Row, Segmented, Sheet, T, Wrap, closeSheet } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { haptic } from '@/ui/motion';
import { NumberPad } from '@/ui/NumberPad';
import { showToast } from '@/ui/toast';
import { radius, useTheme } from '@/ui/theme';

const TYPE_OPTIONS: { id: TxnType; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
];
const METHOD_OPTIONS: { id: SplitMethod; label: string }[] = [
  { id: 'equal', label: 'Equal' },
  { id: 'exact', label: 'Amounts' },
  { id: 'percent', label: 'Percent' },
];

export default function AddTransaction() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useTheme();

  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const friends = useStore((s) => s.friends);
  const groups = useStore((s) => s.groups);
  const lastAccountId = useStore((s) => s.lastAccountId);
  const lastMethod = useStore((s) => s.lastMethod);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);
  const addFriend = useStore((s) => s.addFriend);

  const editing = useMemo(() => transactions.find((x) => x.id === id), [transactions, id]);
  const defaultAccount = accounts.find((a) => a.id === lastAccountId)?.id ?? accounts[0]?.id ?? '';

  const [type, setType] = useState<TxnType>(editing && editing.type !== 'settlement' ? editing.type : 'expense');
  const [amountText, setAmountText] = useState(editing ? String(editing.amount / 100) : '');
  const [categoryId, setCategoryId] = useState<string | undefined>(editing?.categoryId);
  const [accountId, setAccountId] = useState(editing?.accountId || defaultAccount);
  const [toAccountId, setToAccountId] = useState<string | undefined>(editing?.toAccountId);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [needWant, setNeedWant] = useState<NeedWant | undefined>(editing?.needWant);
  const [method, setMethod] = useState<PaymentMethod | undefined>(editing?.paymentMethod);
  const [investmentKind, setInvestmentKind] = useState<InvestmentKind | undefined>(editing?.investmentKind);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split state
  const [splitOn, setSplitOn] = useState(!!editing?.split);
  const [payer, setPayer] = useState(editing?.split?.payer ?? ME);
  const [people, setPeople] = useState<string[]>(editing?.split ? Object.keys(editing.split.shares) : [ME]);
  const [groupId, setGroupId] = useState<string | undefined>(editing?.split?.groupId);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(editing?.split ? 'exact' : 'equal');
  const [values, setValues] = useState<Record<string, string>>(
    editing?.split ? Object.fromEntries(Object.entries(editing.split.shares).map(([k, v]) => [k, String(v / 100)])) : {},
  );
  const [newFriend, setNewFriend] = useState('');

  const orderedCategories = useMemo(() => categoriesByUsage(categories, transactions), [categories, transactions]);
  const amount = parseAmountToPaise(amountText);
  const isInvestment = type === 'expense' && categoryId === INVESTMENT_CATEGORY_ID;
  const splitting = type === 'expense' && splitOn;
  const paidByFriend = splitting && payer !== ME;

  const shares = useMemo(() => {
    if (!splitting) return undefined;
    const nums: Record<string, number> = {};
    for (const p of people) {
      const raw = values[p] ?? '';
      nums[p] = splitMethod === 'exact' ? parseAmountToPaise(raw) : parseFloat(raw) || 0;
    }
    return computeShares(amount, people, splitMethod, nums);
  }, [splitting, people, values, splitMethod, amount]);

  if (editing?.type === 'settlement') return <Redirect href={{ pathname: '/settle', params: { id: editing.id } }} />;

  const nameOf = (pid: string) => (pid === ME ? 'You' : (friends.find((f) => f.id === pid)?.name ?? 'Friend'));

  const togglePerson = (pid: string) => {
    setPeople((cur) => {
      const next = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid];
      if (!next.includes(payer) && payer !== ME) setPayer(ME);
      return next;
    });
  };

  const pickGroup = (gid: string | undefined) => {
    setGroupId(gid);
    const g = groups.find((x) => x.id === gid);
    if (g) setPeople([ME, ...g.memberIds]);
  };

  const submitNewFriend = () => {
    if (!newFriend.trim()) return;
    const fid = addFriend(newFriend);
    setPeople((cur) => (cur.includes(fid) ? cur : [...cur, fid]));
    setNewFriend('');
  };

  const save = () => {
    if (splitting && shares?.error) return setError(shares.error);
    const effectiveMethod =
      type === 'expense' && !paidByFriend
        ? accounts.find((a) => a.id === accountId)?.type === 'credit_card'
          ? 'credit_card'
          : (method ?? lastMethod)
        : undefined;

    const draft: NewTransaction = {
      type,
      amount,
      accountId: paidByFriend ? '' : accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'expense' ? categoryId : undefined,
      description: description.trim() || undefined,
      paymentMethod: effectiveMethod,
      needWant: type === 'expense' ? needWant : undefined,
      investmentKind: isInvestment ? investmentKind : undefined,
      date,
      split: splitting && shares?.shares ? { payer, shares: shares.shares, groupId } : undefined,
    };
    const err = editing ? updateTransaction(editing.id, draft) : addTransaction(draft);
    if (err) setError(err);
    else {
      haptic('success');
      closeSheet();
    }
  };

  const remove = () => {
    if (!editing) return;
    const removed = deleteTransaction(editing.id);
    closeSheet();
    if (removed) showToast('Transaction deleted', { label: 'Undo', onPress: () => restoreTransaction(removed) });
  };

  if (id && !editing) {
    return (
      <Sheet title="Transaction" onClose={closeSheet}>
        <T>This transaction no longer exists.</T>
      </Sheet>
    );
  }

  const typeColor = type === 'expense' ? t.expense : type === 'income' ? t.income : t.primary;

  return (
    <Sheet
      title={editing ? 'Edit transaction' : 'Add transaction'}
      onClose={closeSheet}
      right={
        editing ? (
          <Pressable onPress={remove} accessibilityLabel="Delete transaction" hitSlop={12} testID="delete-txn">
            <Icon name="trash" color={t.expense} />
          </Pressable>
        ) : undefined
      }
      footer={
        <Button
          testID="save-txn"
          label={amount > 0 ? `Save ${formatINR(amount)}` : 'Save'}
          onPress={save}
          disabled={amount <= 0}
        />
      }>
      <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} colorFor={() => typeColor} />

      <View style={{ alignItems: 'center', paddingVertical: 2 }}>
        <T size={46} weight="800" color={amount > 0 ? typeColor : t.faint} style={{ letterSpacing: -1 }}>
          ₹{formatTypedAmount(amountText)}
        </T>
      </View>

      {accounts.length === 0 ? (
        <View style={{ gap: 10 }}>
          <T color={t.muted}>Add an account first so this money has somewhere to come from.</T>
          <Button label="Add account" onPress={() => router.push('/account-form')} />
        </View>
      ) : (
        <>
          {type === 'expense' && (
            <View style={{ gap: 8 }}>
              <Label>Category</Label>
              <Wrap>
                {orderedCategories.map((c) => (
                  <Chip key={c.id} testID={`cat-${c.id}`} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
                ))}
              </Wrap>
            </View>
          )}

          {!paidByFriend && (
            <View style={{ gap: 8 }}>
              <Label>{type === 'income' ? 'Into account' : type === 'transfer' ? 'From account' : 'Paid from'}</Label>
              <Wrap>
                {accounts.map((a) => (
                  <Chip key={a.id} testID={`acct-${a.name}`} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
                ))}
              </Wrap>
            </View>
          )}

          {type === 'transfer' && (
            <View style={{ gap: 8 }}>
              <Label>Send to</Label>
              <Wrap>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <Chip key={a.id} testID={`to-${a.name}`} label={a.name} selected={toAccountId === a.id} onPress={() => setToAccountId(a.id)} />
                  ))}
              </Wrap>
            </View>
          )}
        </>
      )}

      {type === 'expense' && (
        <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: 14, gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T weight="700">Split with friends</T>
              <T size={13} color={t.muted}>
                Only your share counts as your expense.
              </T>
            </View>
            <Switch
              testID="split-switch"
              value={splitOn}
              onValueChange={(v) => {
                haptic('select');
                setSplitOn(v);
              }}
              trackColor={{ true: t.primary }}
            />
          </Row>

          {splitOn && (
            <>
              {groups.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Label>Group</Label>
                  <Wrap>
                    <Chip label="None" selected={!groupId} onPress={() => pickGroup(undefined)} />
                    {groups.map((g) => (
                      <Chip key={g.id} label={g.name} selected={groupId === g.id} onPress={() => pickGroup(g.id)} />
                    ))}
                  </Wrap>
                </View>
              )}

              <View style={{ gap: 8 }}>
                <Label>Split between</Label>
                <Wrap>
                  <Chip label="You" selected={people.includes(ME)} onPress={() => togglePerson(ME)} />
                  {friends.map((f) => (
                    <Chip key={f.id} testID={`with-${f.name}`} label={f.name} selected={people.includes(f.id)} onPress={() => togglePerson(f.id)} />
                  ))}
                </Wrap>
                <Row>
                  <TextInput
                    testID="new-friend"
                    value={newFriend}
                    onChangeText={setNewFriend}
                    placeholder="Add a friend's name"
                    placeholderTextColor={t.faint}
                    onSubmitEditing={submitNewFriend}
                    style={{ flex: 1, backgroundColor: t.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontSize: 15 }}
                  />
                  <Chip testID="add-friend-inline" label="Add" onPress={submitNewFriend} />
                </Row>
              </View>

              <View style={{ gap: 8 }}>
                <Label>Paid by</Label>
                <Wrap>
                  {people.map((p) => (
                    <Chip key={p} testID={`payer-${nameOf(p)}`} label={nameOf(p)} selected={payer === p} onPress={() => setPayer(p)} />
                  ))}
                </Wrap>
              </View>

              <Segmented options={METHOD_OPTIONS} value={splitMethod} onChange={setSplitMethod} />

              {splitMethod !== 'equal' &&
                people.map((p) => (
                  <Row key={p}>
                    <T style={{ flex: 1 }} weight="600">
                      {nameOf(p)}
                    </T>
                    <TextInput
                      testID={`share-${nameOf(p)}`}
                      value={values[p] ?? ''}
                      onChangeText={(v) => setValues((cur) => ({ ...cur, [p]: v }))}
                      keyboardType="decimal-pad"
                      placeholder={splitMethod === 'exact' ? '₹ 0' : '% 0'}
                      placeholderTextColor={t.faint}
                      style={{ width: 110, textAlign: 'right', backgroundColor: t.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontSize: 15 }}
                    />
                  </Row>
                ))}

              {amount > 0 && (
                <T size={13} weight="600" color={shares?.error ? t.expense : t.muted} testID="split-summary">
                  {shares?.error
                    ? shares.error
                    : people
                        .map((p) => `${nameOf(p)} ${formatINR(shares?.shares?.[p] ?? 0)}`)
                        .join(' · ')}
                </T>
              )}
            </>
          )}
        </View>
      )}

      <NumberPad onKey={(k: PadKey) => setAmountText((cur) => pressKey(cur, k))} />

      <Pressable onPress={() => setMore((m) => !m)} testID="toggle-more" style={{ alignSelf: 'center', padding: 6 }}>
        <Row style={{ gap: 6 }}>
          <T size={14} weight="700" color={t.primary}>
            {more ? 'Fewer details' : 'More details'}
          </T>
          <Icon name="chevronDown" size={16} color={t.primary} />
        </Row>
      </Pressable>

      {more && (
        <View style={{ gap: 16 }}>
          <Field testID="input-note" label="Note" value={description} onChangeText={setDescription} placeholder="What was it for?" />

          <View style={{ gap: 8 }}>
            <Label>Date</Label>
            <Wrap>
              <Chip label="Today" selected={date === todayISO()} onPress={() => setDate(todayISO())} />
              <Chip label="Yesterday" selected={date === addDaysISO(todayISO(), -1)} onPress={() => setDate(addDaysISO(todayISO(), -1))} />
            </Wrap>
            <TextInput
              testID="input-date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={t.faint}
              autoCapitalize="none"
              style={{ backgroundColor: t.surface, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: isValidISO(date) ? t.text : t.expense }}
            />
            {isValidISO(date) && <T size={12} color={t.muted}>{formatDateShort(date)}</T>}
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
                      color={n === 'need' ? t.need : t.want}
                    />
                  ))}
                </Wrap>
              </View>
              {!paidByFriend && (
                <View style={{ gap: 8 }}>
                  <Label>Payment method</Label>
                  <Wrap>
                    {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                      <Chip key={m} label={PAYMENT_METHOD_LABEL[m]} selected={method === m} onPress={() => setMethod(method === m ? undefined : m)} />
                    ))}
                  </Wrap>
                </View>
              )}
            </>
          )}

          {isInvestment && (
            <View style={{ gap: 8 }}>
              <Label>Invested in</Label>
              <Wrap>
                {INVESTMENT_KINDS.map((k) => (
                  <Chip key={k} label={INVESTMENT_KIND_LABEL[k]} selected={investmentKind === k} onPress={() => setInvestmentKind(investmentKind === k ? undefined : k)} />
                ))}
              </Wrap>
            </View>
          )}
        </View>
      )}

      {error && (
        <T color={t.expense} weight="600">
          {error}
        </T>
      )}
    </Sheet>
  );
}
