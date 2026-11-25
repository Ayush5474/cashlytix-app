import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';

import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL } from '@/domain/defaults';
import { parseAmountToPaise } from '@/domain/money';
import type { AccountType } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, Row, Screen, T, Wrap } from '@/ui/components';
import { Icon } from '@/ui/Icon';
import { colors, radius } from '@/ui/theme';

const Label = ({ children }: { children: string }) => (
  <T size={12} weight="700" color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
    {children}
  </T>
);

export default function AccountForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
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

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const isCard = type === 'credit_card';

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the account a name.');
    if (accounts.some((a) => a.id !== editing?.id && a.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError('You already have an account with this name.');
    }
    const data = {
      name: trimmed,
      type,
      openingBalance: parseAmountToPaise(opening),
      includeInTotal: include,
    };
    if (editing) updateAccount(editing.id, data);
    else addAccount(data);
    close();
  };

  const remove = () => {
    if (!editing) return;
    if (!deleteAccount(editing.id)) {
      setError('This account has transactions. Delete or move them first.');
      return;
    }
    close();
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={close} accessibilityLabel="Close" hitSlop={12}>
          <Icon name="close" />
        </Pressable>
        <T size={17} weight="800">
          {editing ? 'Edit account' : 'New account'}
        </T>
        <View style={{ width: 22 }} />
      </Row>

      <View style={{ gap: 8 }}>
        <Label>Name</Label>
        <TextInput
          testID="account-name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Salary account"
          placeholderTextColor="#94A3B8"
          style={inputStyle}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Label>Type</Label>
        <Wrap>
          {ACCOUNT_TYPES.map((t) => (
            <Chip
              key={t}
              testID={`type-${t}`}
              label={ACCOUNT_TYPE_LABEL[t]}
              selected={type === t}
              onPress={() => setType(t)}
            />
          ))}
        </Wrap>
      </View>

      <View style={{ gap: 8 }}>
        <Label>{isCard ? 'Amount you owe today' : 'Current balance'}</Label>
        <TextInput
          testID="account-opening"
          value={opening}
          onChangeText={setOpening}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="decimal-pad"
          style={inputStyle}
        />
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T weight="700">Include in total balance</T>
          <T size={13} color={colors.muted}>
            Turn off for accounts you want to track separately.
          </T>
        </View>
        <Switch value={include} onValueChange={setInclude} trackColor={{ true: colors.primary }} />
      </Row>

      {error && <T color={colors.expense} weight="600">{error}</T>}

      <Button label={editing ? 'Save changes' : 'Add account'} onPress={save} testID="save-account" />
      {editing && <Button label="Delete account" variant="danger" onPress={remove} />}
    </Screen>
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
