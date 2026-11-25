import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL } from '@/domain/defaults';
import { parseAmountToPaise } from '@/domain/money';
import type { AccountType } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, Field, Label, Row, Sheet, T, Wrap, closeSheet } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function AccountForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useTheme();
  const accounts = useStore((s) => s.accounts);
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const deleteAccount = useStore((s) => s.deleteAccount);

  const editing = accounts.find((a) => a.id === id);
  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<AccountType>(editing?.type ?? 'checking');
  const [opening, setOpening] = useState(editing ? String(editing.openingBalance / 100) : '');
  const [include, setInclude] = useState(editing?.includeInTotal ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the account a name.');
    if (accounts.some((a) => a.id !== editing?.id && a.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError('You already have an account with this name.');
    }
    const data = { name: trimmed, type, openingBalance: parseAmountToPaise(opening), includeInTotal: include };
    if (editing) updateAccount(editing.id, data);
    else addAccount(data);
    closeSheet();
  };

  const remove = () => {
    if (!editing) return;
    if (!deleteAccount(editing.id)) return setError('This account has transactions or recurring entries. Remove those first.');
    closeSheet();
  };

  return (
    <Sheet title={editing ? 'Edit account' : 'New account'} onClose={closeSheet} footer={<Button label={editing ? 'Save changes' : 'Add account'} onPress={save} testID="save-account" />}>
      <Field testID="account-name" label="Name" value={name} onChangeText={setName} placeholder="e.g. Salary account" />
      <View style={{ gap: 8 }}>
        <Label>Type</Label>
        <Wrap>
          {ACCOUNT_TYPES.map((x) => (
            <Chip key={x} testID={`type-${x}`} label={ACCOUNT_TYPE_LABEL[x]} selected={type === x} onPress={() => setType(x)} />
          ))}
        </Wrap>
      </View>
      <Field
        testID="account-opening"
        label={type === 'credit_card' ? 'Amount you owe today' : 'Current balance'}
        value={opening}
        onChangeText={setOpening}
        placeholder="0"
        keyboardType="decimal-pad"
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T weight="700">Include in total balance</T>
          <T size={13} color={t.muted}>
            Turn off for accounts you want to track separately.
          </T>
        </View>
        <Switch value={include} onValueChange={setInclude} trackColor={{ true: t.primary }} />
      </Row>
      {error && <T color={t.expense} weight="600">{error}</T>}
      {editing && <Button label="Delete account" variant="danger" onPress={remove} />}
    </Sheet>
  );
}
