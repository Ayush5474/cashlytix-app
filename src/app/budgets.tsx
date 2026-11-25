import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LIMIT_LABEL, limitFor } from '@/domain/plan';
import { formatINR, parseAmountToPaise } from '@/domain/money';
import { useStore } from '@/store/useStore';
import { Button, Card, Field, Header, Screen, SectionTitle, T } from '@/ui/components';
import { showToast } from '@/ui/toast';
import { useTheme } from '@/ui/theme';
import { usePlan } from '@/ui/usePlan';

export default function Budgets() {
  const t = useTheme();
  const { isPro } = usePlan();
  const categories = useStore((s) => s.categories);
  const monthlyBudget = useStore((s) => s.monthlyBudget);
  const setMonthlyBudget = useStore((s) => s.setMonthlyBudget);
  const updateCategory = useStore((s) => s.updateCategory);

  const [overall, setOverall] = useState(monthlyBudget ? String(monthlyBudget / 100) : '');
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.id, c.budget ? String(c.budget / 100) : ''])),
  );

  // Savings and investments are not "spending", so they have no budget.
  const budgetable = categories.filter((c) => c.group !== 'saved');
  const maxCategoryBudgets = limitFor(isPro, 'categoryBudgets');

  const save = () => {
    const wanted = budgetable.filter((c) => parseAmountToPaise(limits[c.id] ?? '') > 0);
    if (wanted.length > maxCategoryBudgets) {
      router.push({ pathname: '/upgrade', params: { feature: 'categoryBudgets' } });
      return;
    }
    setMonthlyBudget(parseAmountToPaise(overall) || undefined);
    for (const c of budgetable) {
      const v = parseAmountToPaise(limits[c.id] ?? '');
      updateCategory(c.id, { budget: v > 0 ? v : undefined });
    }
    showToast('Budgets saved');
    router.back();
  };

  return (
    <Screen header={<Header title="Budgets" subtitle="Monthly limits" back />} bottomPad={20}>
      <Card>
        <Field testID="budget-overall" label="Overall monthly budget (₹)" value={overall} onChangeText={setOverall} keyboardType="decimal-pad" placeholder="e.g. 40000" />
        <T size={13} color={t.muted}>
          Counts needs and wants. Money you put into savings or investments is not counted as spending.
        </T>
      </Card>

      <SectionTitle>Per category</SectionTitle>
      <T size={13} color={t.muted}>
        {isPro ? 'Unlimited category budgets on Pro.' : `Free plan: up to ${maxCategoryBudgets} ${LIMIT_LABEL.categoryBudgets}.`}
      </T>
      <View style={{ gap: 14 }}>
        {budgetable.map((c) => (
          <Field
            key={c.id}
            testID={`budget-${c.id}`}
            label={c.name + (c.budget ? `  ·  now ${formatINR(c.budget)}` : '')}
            value={limits[c.id] ?? ''}
            onChangeText={(v) => setLimits((cur) => ({ ...cur, [c.id]: v }))}
            keyboardType="decimal-pad"
            placeholder="No limit"
          />
        ))}
      </View>
      <Button testID="save-budgets" label="Save budgets" onPress={save} />
    </Screen>
  );
}
