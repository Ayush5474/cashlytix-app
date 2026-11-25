import { router } from 'expo-router';
import { View, Pressable } from 'react-native';

import { ACCOUNT_TYPE_LABEL } from '@/domain/defaults';
import { accountBalance, isLiability, totalBalance } from '@/domain/ledger';
import { formatINR } from '@/domain/money';
import { useStore } from '@/store/useStore';
import { Button, Card, Empty, Row, Screen, SectionTitle, T } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function Accounts() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const total = totalBalance(accounts, transactions);

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <T size={13} weight="600" color="#CCFBF1">
          Total balance
        </T>
        <T size={30} weight="800" color="#fff">
          {formatINR(total)}
        </T>
        <T size={12} color="#CCFBF1">
          Credit card dues are subtracted. Accounts switched off are left out.
        </T>
      </Card>

      <SectionTitle>Your accounts</SectionTitle>
      {accounts.length === 0 ? (
        <Empty title="No accounts yet" hint="Add cash, a bank account, a wallet or a credit card." />
      ) : (
        accounts.map((a) => {
          const bal = accountBalance(a, transactions);
          const liability = isLiability(a.type);
          return (
            <Pressable
              key={a.id}
              testID={`account-${a.name}`}
              onPress={() => router.push({ pathname: '/account-form', params: { id: a.id } })}>
              <Card style={{ opacity: a.includeInTotal ? 1 : 0.6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <T weight="800" size={16}>
                      {a.name}
                    </T>
                    <T size={13} color={colors.muted}>
                      {ACCOUNT_TYPE_LABEL[a.type]}
                      {a.includeInTotal ? '' : ' · not in total'}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <T weight="800" size={18} color={liability && bal > 0 ? colors.expense : colors.text}>
                      {formatINR(bal)}
                    </T>
                    {liability && (
                      <T size={12} color={colors.muted}>
                        owed
                      </T>
                    )}
                  </View>
                </Row>
              </Card>
            </Pressable>
          );
        })
      )}
      <Button label="Add account" onPress={() => router.push('/account-form')} testID="add-account" />
    </Screen>
  );
}
