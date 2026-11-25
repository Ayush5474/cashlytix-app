import { router } from 'expo-router';
import { View } from 'react-native';

import { ACCOUNT_TYPE_LABEL } from '@/domain/defaults';
import { accountBalance, isLiability, totalBalance } from '@/domain/ledger';
import { formatINR } from '@/domain/money';
import { useStore } from '@/store/useStore';
import { Button, Card, Empty, Header, Pressy, Reveal, Row, Screen, SectionTitle, T } from '@/ui/components';
import { useCountUp } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { usePlan } from '@/ui/usePlan';

export default function Accounts() {
  const t = useTheme();
  const { guard } = usePlan();
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const total = useCountUp(totalBalance(accounts, transactions));

  return (
    <Screen header={<Header title="Accounts" />}>
      <Reveal>
        <View style={{ gap: 4 }}>
          <T size={14} weight="600" color={t.muted}>
            Total balance
          </T>
          <T size={36} weight="800" style={{ letterSpacing: -0.8 }}>
            {formatINR(total)}
          </T>
          <T size={12} color={t.muted}>
            Credit card dues are subtracted. Accounts switched off are left out.
          </T>
        </View>
      </Reveal>

      <SectionTitle>Your accounts</SectionTitle>
      {accounts.length === 0 ? (
        <Empty title="No accounts yet" hint="Add cash, a bank account, a wallet or a credit card." />
      ) : (
        accounts.map((a, i) => {
          const bal = accountBalance(a, transactions);
          const liability = isLiability(a.type);
          return (
            <Reveal key={a.id} index={i}>
              <Pressy
                testID={`account-${a.name}`}
                onPress={() => router.push({ pathname: '/account-form', params: { id: a.id } })}
                scaleTo={0.985}>
                <Card style={{ opacity: a.includeInTotal ? 1 : 0.6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ gap: 2, flex: 1 }}>
                      <T weight="800" size={16}>
                        {a.name}
                      </T>
                      <T size={13} color={t.muted}>
                        {ACCOUNT_TYPE_LABEL[a.type]}
                        {a.includeInTotal ? '' : ' · not in total'}
                      </T>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <T weight="800" size={18} color={liability && bal > 0 ? t.expense : t.text}>
                        {formatINR(bal)}
                      </T>
                      {liability && (
                        <T size={12} color={t.muted}>
                          owed
                        </T>
                      )}
                    </View>
                  </Row>
                </Card>
              </Pressy>
            </Reveal>
          );
        })
      )}
      <Button
        label="Add account"
        testID="add-account"
        onPress={() => guard('accounts', accounts.length, () => router.push('/account-form'))}
      />
    </Screen>
  );
}
