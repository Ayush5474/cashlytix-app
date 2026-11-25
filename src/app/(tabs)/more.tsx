import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { useStore, type ThemeMode } from '@/store/useStore';
import { Button, Card, Chip, Divider, Header, NavRow, Screen, SectionTitle, T, Wrap } from '@/ui/components';
import { showToast } from '@/ui/toast';
import { useTheme } from '@/ui/theme';

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function More() {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const resetAll = useStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Screen header={<Header title="More" />}>
      <Card style={{ gap: 0 }}>
        <NavRow title="Budgets" subtitle="Monthly and per-category limits" onPress={() => router.push('/budgets')} testID="go-budgets" />
        <Divider />
        <NavRow title="Recurring entries" subtitle="Rent, EMIs, SIPs, salary" onPress={() => router.push('/recurring')} testID="go-recurring" />
        <Divider />
        <NavRow title="Categories" subtitle="Add, rename, choose Need / Want / Saved" onPress={() => router.push('/categories')} testID="go-categories" />
        <Divider />
        <NavRow title="Backup & export" subtitle="CSV, full backup, restore" onPress={() => router.push('/backup')} testID="go-backup" />
      </Card>

      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <Wrap>
          {THEMES.map((x) => (
            <Chip key={x.id} testID={`theme-${x.id}`} label={x.label} selected={settings.theme === x.id} onPress={() => setSettings({ theme: x.id })} />
          ))}
        </Wrap>
      </Card>

      <Card>
        <SectionTitle>Plan</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T weight="700">{settings.pro ? 'Pro (preview)' : 'Free plan'}</T>
            <T size={13} color={t.muted}>
              {settings.pro ? 'All limits are off while you test.' : 'Limited accounts, budgets, groups and recurring entries.'}
            </T>
          </View>
          <Switch testID="pro-switch" value={settings.pro} onValueChange={(v) => setSettings({ pro: v })} trackColor={{ true: t.primary }} />
        </View>
        {!settings.pro && <Button variant="soft" label="See what Pro includes" onPress={() => router.push('/upgrade')} />}
      </Card>

      <Card>
        <SectionTitle>Danger zone</SectionTitle>
        {confirmReset ? (
          <>
            <T color={t.expense} weight="600">
              This deletes all accounts, transactions, friends and budgets from this device.
            </T>
            <Button
              testID="confirm-reset"
              variant="danger"
              label="Yes, delete everything"
              onPress={() => {
                resetAll();
                setConfirmReset(false);
                showToast('All data cleared');
              }}
            />
            <Button variant="soft" label="Cancel" onPress={() => setConfirmReset(false)} />
          </>
        ) : (
          <Button testID="reset-data" variant="danger" label="Delete all data" onPress={() => setConfirmReset(true)} />
        )}
      </Card>

      <T size={12} color={t.faint} style={{ textAlign: 'center' }}>
        Cashlytix · version 0.2 · data is stored on this device
      </T>
    </Screen>
  );
}
